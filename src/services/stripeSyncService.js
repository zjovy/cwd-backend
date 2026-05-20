import Stripe from 'stripe';

import donationRepository from '../repositories/donationRepository.js';
import donorRepository from '../repositories/donorRepository.js';
import syncMetaRepository from '../repositories/syncMetaRepository.js';

const stripe = new Stripe(process.env.STRIPE_API_KEY);

// Format a Unix timestamp (seconds) as YYYY-MM-DD in the foundation's local
// timezone. Matches what Stripe shows in CSV exports / Dashboard, which use
// the account's configured timezone (America/Chicago for Evanston, IL).
const DONATION_TZ = 'America/Chicago';
const dateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: DONATION_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function formatLocalDate(unixSeconds) {
  return dateFormatter.format(new Date(unixSeconds * 1000));
}

function extractDonorFields(pi) {
  const email =
    pi.customer?.email ??
    pi.receipt_email ??
    pi.metadata?.email_address ??
    null;

  const rawName =
    pi.customer?.name ??
    pi.latest_charge?.billing_details?.name ??
    pi.metadata?.name ??
    '';
  const spaceIdx = rawName.indexOf(' ');
  const first_name = spaceIdx === -1 ? rawName : rawName.slice(0, spaceIdx);
  const last_name = spaceIdx === -1 ? '' : rawName.slice(spaceIdx + 1);

  const phone = pi.customer?.phone ?? null;

  const addr = pi.latest_charge?.billing_details?.address;
  const address = addr
    ? [
        addr.line1,
        addr.line2,
        addr.city,
        addr.state,
        addr.postal_code,
        addr.country,
      ]
        .filter(Boolean)
        .join(', ') || null
    : null;

  return { email, first_name, last_name, phone, address };
}

const stripeSyncService = {
  async sync() {
    const inserted = [];
    const skipped = [];
    const errors = [];

    const cursor = await donationRepository.getMaxStripeCreatedAt();

    const listParams = {
      limit: 100,
      expand: ['data.customer', 'data.latest_charge'],
    };
    if (cursor) listParams.created = { gte: cursor };

    let hasMore = true;
    let startingAfter = null;
    const paymentIntents = [];

    while (hasMore) {
      if (startingAfter) listParams.starting_after = startingAfter;
      const page = await stripe.paymentIntents.list(listParams);
      paymentIntents.push(
        ...page.data.filter((pi) => pi.status === 'succeeded')
      );
      hasMore = page.has_more;
      if (page.data.length > 0) {
        startingAfter = page.data[page.data.length - 1].id;
      } else {
        hasMore = false;
      }
    }

    for (const pi of paymentIntents) {
      try {
        const { email, first_name, last_name, phone, address } =
          extractDonorFields(pi);

        let donor;
        if (email) {
          donor = await donorRepository.findOrCreateByEmail({
            first_name,
            last_name,
            email,
            phone,
            address,
          });
        } else if (first_name || last_name) {
          const alreadyExists = await donationRepository.existsByStripeId(
            pi.id
          );
          if (alreadyExists) {
            skipped.push(pi.id);
            continue;
          }
          const created = await donorRepository.createDonor({
            first_name,
            last_name,
            email: null,
            phone,
            address,
          });
          donor = { id: created.insertId };
        } else {
          skipped.push(pi.id);
          continue;
        }

        const result = await donationRepository.createStripeDonation({
          donor_id: donor.id,
          amount: pi.amount / 100,
          donation_date: formatLocalDate(pi.created),
          description: pi.metadata?.event_name ?? null,
          stripe_payment_intent_id: pi.id,
          stripe_created_at: pi.created,
        });

        if (result.affectedRows > 0) {
          inserted.push(pi.id);
        } else {
          skipped.push(pi.id);
        }
      } catch (err) {
        errors.push({ stripe_id: pi.id, message: err.message });
      }
    }

    try {
      await syncMetaRepository.setLastSync('stripe_last_sync');
    } catch (err) {
      console.error('Failed to record stripe_last_sync:', err);
    }
    return { inserted: inserted.length, skipped: skipped.length, errors };
  },
};

export default stripeSyncService;
