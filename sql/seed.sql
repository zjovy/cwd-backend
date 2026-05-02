-- Seed data for local development
-- Run with: npm run seed

SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE donations;
TRUNCATE TABLE donors;
SET FOREIGN_KEY_CHECKS = 1;

-- Donors: total_donations, donation_count, and most_recent match the donations below exactly
INSERT INTO donors (name, email, address, phone, total_donations, donation_count, most_recent) VALUES
  -- Regular donors (6+ donations)
  ('Alice Johnson',   'alice.johnson84@gmail.com',     '214 Maple Ave',       '(312) 555-0101', 2325.00, 10, '2026-03-05'),
  ('Carol White',     'carolwhite77@yahoo.com',        '503 Riverside Blvd',  '(847) 555-0263', 2600.00, 9,  '2026-03-01'),
  ('Sandra Morales',  'sandramorales@icloud.com',      '234 Cloverdale St',   '(847) 555-1021', 2575.00, 8,  '2026-02-18'),
  ('James Okafor',    'james.okafor@gmail.com',        '112 Birchwood Rd',    '(773) 555-0728', 1455.00, 7,  '2026-03-12'),
  ('Bob Smith',       'bsmith.chicago@outlook.com',    '87 Lakeview Dr',      '(773) 555-0142', 1025.00, 6,  '2026-02-14'),
  ('Emily Torres',    'emilytorres@icloud.com',        '761 Sunset Rd',       '(312) 555-0415', 1475.00, 6,  '2026-02-27'),
  -- Occasional donors (3–5 donations)
  ('Linda Park',      'lindapark55@yahoo.com',         '67 Greenfield Ave',   '(312) 555-0819',  525.00, 5,  '2025-11-22'),
  ('David Kim',       'dkim.family@gmail.com',         '19 Thornwood Ct',     '(630) 555-0384',  350.00, 5,  '2025-12-18'),
  ('Margaret Chen',   'margaret.chen@outlook.com',     '328 Elmwood Pl',      '(847) 555-0637',  775.00, 4,  '2025-01-15'),
  ('Kevin Patel',     'kpatel.work@gmail.com',         '890 Willow Creek Dr', '(630) 555-0960',  600.00, 3,  '2026-01-30'),
  ('Frank Nguyen',    'f.nguyen92@gmail.com',          '45 Oak Park Ln',      '(708) 555-0596',  250.00, 3,  '2025-12-05'),
  -- Two-time donors
  ('Tom Fitzgerald',  'tfitzgerald@outlook.com',       '55 Briar Hill Ln',    '(708) 555-1132',  175.00, 2,  '2025-08-14'),
  ('Marcus Williams', 'marcuswill91@gmail.com',        '403 Sycamore Ct',     '(773) 555-1243',  125.00, 2,  '2025-07-14'),
  ('Ryan O\'Brien',   'ryan.obrien@outlook.com',       '78 Hawthorn Blvd',    '(312) 555-1354',  350.00, 2,  '2026-01-11'),
  ('Natalie Brooks',  'nataliebrooks@icloud.com',      '561 Pinecrest Dr',    '(630) 555-1465',  275.00, 2,  '2025-12-19'),
  -- One-time donors
  ('Priya Sharma',    'priya.sharma88@gmail.com',      '29 Redwood Terr',     '(847) 555-1576',  250.00, 1,  '2025-03-22'),
  ('Lisa Chen',       'lisachen.personal@gmail.com',   '104 Walnut Grove Ln', '(312) 555-1687',  100.00, 1,  '2024-11-08'),
  ('Aisha Jackson',   'aisha.j@yahoo.com',             '715 Lakewood Ave',    '(773) 555-1798',   75.00, 1,  '2025-09-30'),
  ('Daniel Reyes',    'danielreyes@gmail.com',         '238 Foxglove Rd',     '(708) 555-1809',  200.00, 1,  '2024-06-17'),
  ('Owen Murray',     'owen.murray@outlook.com',       '92 Elmhurst Pkwy',    '(847) 555-1910',   50.00, 1,  '2025-02-03'),
  ('Sofia Hernandez', 'sofia.hernandez@gmail.com',     '317 Crestwood Dr',    '(312) 555-2021',  150.00, 1,  '2024-08-25'),
  ('Ethan Wallace',   'ethanwallace@yahoo.com',        '48 Ridgeline Ave',    '(630) 555-2132',  100.00, 1,  '2025-05-14'),
  ('Rachel Goldstein','rgoldstein@outlook.com',        '822 Fernwood Ct',     '(847) 555-2243',  500.00, 1,  '2024-12-02'),
  ('Marcus Tran',     'marcus.tran92@gmail.com',       '193 Chestnut Blvd',   '(773) 555-2354',   75.00, 1,  '2025-07-19'),
  ('Isabelle Dupont', 'idupont.personal@icloud.com',   '60 Willowmere Ln',    '(708) 555-2465',  300.00, 1,  '2026-01-07'),
  ('Andre Coleman',   'andrecoleman@gmail.com',        '445 Spruce Hill Rd',  '(312) 555-2576',   25.00, 1,  '2025-04-03'),
  ('Nina Vasquez',    'ninavasquez88@yahoo.com',       '71 Brookside Terr',   '(847) 555-2687',  125.00, 1,  '2024-09-30'),
  ('Christopher Lee', 'clee.home@gmail.com',           '209 Ashford Way',     '(630) 555-2798',  250.00, 1,  '2025-11-06'),
  ('Fatima Al-Hassan','fatima.alhassan@outlook.com',   '534 Cliffside Pkwy',  '(773) 555-2809',   50.00, 1,  '2025-06-22'),
  ('Jordan Blake',    'jordanblake@icloud.com',        '87 Meadowlark Dr',    '(708) 555-2910',  175.00, 1,  '2026-02-09');

INSERT INTO donations (donor_name, donor_email, amount, donation_date, receipt_status) VALUES
  -- Alice Johnson (regular major donor, 10 donations)
  ('Alice Johnson', 'alice.johnson84@gmail.com',  250.00, '2024-01-15', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  100.00, '2024-04-08', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  500.00, '2024-07-22', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  150.00, '2024-10-14', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  250.00, '2025-01-10', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  175.00, '2025-04-30', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  300.00, '2025-07-08', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  350.00, '2025-11-28', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  100.00, '2026-01-20', 'sent'),
  ('Alice Johnson', 'alice.johnson84@gmail.com',  150.00, '2026-03-05', 'pending'),

  -- Carol White (high-value consistent donor, 9 donations)
  ('Carol White', 'carolwhite77@yahoo.com', 500.00, '2024-03-20', 'sent'),
  ('Carol White', 'carolwhite77@yahoo.com',  20.00, '2024-07-12', 'sent'),
  ('Carol White', 'carolwhite77@yahoo.com', 350.00, '2024-12-20', 'sent'),
  ('Carol White', 'carolwhite77@yahoo.com',  30.00, '2025-03-05', 'sent'),
  ('Carol White', 'carolwhite77@yahoo.com', 275.00, '2025-06-30', 'sent'),
  ('Carol White', 'carolwhite77@yahoo.com', 450.00, '2025-08-19', 'sent'),
  ('Carol White', 'carolwhite77@yahoo.com', 500.00, '2025-11-10', 'sent'),
  ('Carol White', 'carolwhite77@yahoo.com', 450.00, '2026-01-09', 'sent'),
  ('Carol White', 'carolwhite77@yahoo.com',  25.00, '2026-03-01', 'pending'),

  -- Sandra Morales (high-value, year-end spikes, 8 donations)
  ('Sandra Morales', 'sandramorales@icloud.com', 300.00, '2024-02-07', 'sent'),
  ('Sandra Morales', 'sandramorales@icloud.com', 250.00, '2024-05-21', 'sent'),
  ('Sandra Morales', 'sandramorales@icloud.com',  25.00, '2024-09-15', 'sent'),
  ('Sandra Morales', 'sandramorales@icloud.com', 600.00, '2024-12-28', 'sent'),
  ('Sandra Morales', 'sandramorales@icloud.com', 275.00, '2025-03-18', 'sent'),
  ('Sandra Morales', 'sandramorales@icloud.com', 350.00, '2025-07-04', 'sent'),
  ('Sandra Morales', 'sandramorales@icloud.com', 500.00, '2025-12-31', 'sent'),
  ('Sandra Morales', 'sandramorales@icloud.com', 275.00, '2026-02-18', 'pending'),

  -- James Okafor (steady mid-level donor, 7 donations)
  ('James Okafor', 'james.okafor@gmail.com', 200.00, '2024-01-28', 'sent'),
  ('James Okafor', 'james.okafor@gmail.com', 175.00, '2024-05-03', 'sent'),
  ('James Okafor', 'james.okafor@gmail.com', 300.00, '2024-08-19', 'sent'),
  ('James Okafor', 'james.okafor@gmail.com', 250.00, '2024-12-05', 'sent'),
  ('James Okafor', 'james.okafor@gmail.com', 350.00, '2025-04-14', 'sent'),
  ('James Okafor', 'james.okafor@gmail.com',  30.00, '2025-10-30', 'sent'),
  ('James Okafor', 'james.okafor@gmail.com', 150.00, '2026-03-12', 'pending'),

  -- Bob Smith (moderate, some gaps, 6 donations)
  ('Bob Smith', 'bsmith.chicago@outlook.com',  75.00, '2024-02-10', 'sent'),
  ('Bob Smith', 'bsmith.chicago@outlook.com', 150.00, '2024-06-15', 'sent'),
  ('Bob Smith', 'bsmith.chicago@outlook.com', 200.00, '2024-09-25', 'sent'),
  ('Bob Smith', 'bsmith.chicago@outlook.com', 100.00, '2025-02-14', 'sent'),
  ('Bob Smith', 'bsmith.chicago@outlook.com', 300.00, '2025-10-05', 'sent'),
  ('Bob Smith', 'bsmith.chicago@outlook.com', 200.00, '2026-02-14', 'sent'),

  -- Emily Torres (growing donor, 6 donations)
  ('Emily Torres', 'emilytorres@icloud.com', 100.00, '2024-05-18', 'sent'),
  ('Emily Torres', 'emilytorres@icloud.com', 150.00, '2024-11-03', 'sent'),
  ('Emily Torres', 'emilytorres@icloud.com', 200.00, '2025-04-22', 'sent'),
  ('Emily Torres', 'emilytorres@icloud.com', 275.00, '2025-06-30', 'sent'),
  ('Emily Torres', 'emilytorres@icloud.com', 425.00, '2025-10-22', 'sent'),
  ('Emily Torres', 'emilytorres@icloud.com', 325.00, '2026-02-27', 'pending'),

  -- Linda Park (occasional, 5 donations)
  ('Linda Park', 'lindapark55@yahoo.com',  75.00, '2024-03-11', 'sent'),
  ('Linda Park', 'lindapark55@yahoo.com', 100.00, '2024-07-29', 'sent'),
  ('Linda Park', 'lindapark55@yahoo.com', 125.00, '2025-01-06', 'sent'),
  ('Linda Park', 'lindapark55@yahoo.com', 100.00, '2025-06-18', 'sent'),
  ('Linda Park', 'lindapark55@yahoo.com', 125.00, '2025-11-22', 'sent'),

  -- David Kim (small infrequent, 5 donations)
  ('David Kim', 'dkim.family@gmail.com',  50.00, '2024-06-30', 'sent'),
  ('David Kim', 'dkim.family@gmail.com',  75.00, '2024-11-15', 'sent'),
  ('David Kim', 'dkim.family@gmail.com',  50.00, '2025-02-14', 'sent'),
  ('David Kim', 'dkim.family@gmail.com', 100.00, '2025-09-11', 'sent'),
  ('David Kim', 'dkim.family@gmail.com',  75.00, '2025-12-18', 'sent'),

  -- Margaret Chen (lapsed, last donation Jan 2025, 4 donations)
  ('Margaret Chen', 'margaret.chen@outlook.com', 200.00, '2024-02-20', 'sent'),
  ('Margaret Chen', 'margaret.chen@outlook.com', 150.00, '2024-05-10', 'sent'),
  ('Margaret Chen', 'margaret.chen@outlook.com', 250.00, '2024-09-08', 'sent'),
  ('Margaret Chen', 'margaret.chen@outlook.com', 175.00, '2025-01-15', 'sent'),

  -- Kevin Patel (newer donor, 3 donations)
  ('Kevin Patel', 'kpatel.work@gmail.com', 150.00, '2025-05-09', 'sent'),
  ('Kevin Patel', 'kpatel.work@gmail.com', 250.00, '2025-09-23', 'sent'),
  ('Kevin Patel', 'kpatel.work@gmail.com', 200.00, '2026-01-30', 'sent'),

  -- Frank Nguyen (infrequent small, 3 donations)
  ('Frank Nguyen', 'f.nguyen92@gmail.com',  50.00, '2024-08-08', 'sent'),
  ('Frank Nguyen', 'f.nguyen92@gmail.com',  75.00, '2025-05-17', 'sent'),
  ('Frank Nguyen', 'f.nguyen92@gmail.com', 125.00, '2025-12-05', 'sent'),

  -- Two-time donors
  ('Tom Fitzgerald',  'tfitzgerald@outlook.com',  100.00, '2024-04-16', 'sent'),
  ('Tom Fitzgerald',  'tfitzgerald@outlook.com',   75.00, '2025-08-14', 'sent'),

  ('Marcus Williams', 'marcuswill91@gmail.com',    50.00, '2025-03-27', 'sent'),
  ('Marcus Williams', 'marcuswill91@gmail.com',    75.00, '2025-07-14', 'sent'),

  ('Ryan O\'Brien',   'ryan.obrien@outlook.com',  150.00, '2025-08-02', 'sent'),
  ('Ryan O\'Brien',   'ryan.obrien@outlook.com',  200.00, '2026-01-11', 'sent'),

  ('Natalie Brooks',  'nataliebrooks@icloud.com', 125.00, '2025-06-08', 'sent'),
  ('Natalie Brooks',  'nataliebrooks@icloud.com', 150.00, '2025-12-19', 'sent'),

  -- One-time donors
  ('Priya Sharma',    'priya.sharma88@gmail.com',    250.00, '2025-03-22', 'sent'),
  ('Lisa Chen',       'lisachen.personal@gmail.com', 100.00, '2024-11-08', 'sent'),
  ('Aisha Jackson',   'aisha.j@yahoo.com',            75.00, '2025-09-30', 'sent'),
  ('Daniel Reyes',    'danielreyes@gmail.com',       200.00, '2024-06-17', 'sent'),
  ('Owen Murray',     'owen.murray@outlook.com',      50.00, '2025-02-03', 'sent'),
  ('Sofia Hernandez', 'sofia.hernandez@gmail.com',   150.00, '2024-08-25', 'sent'),
  ('Ethan Wallace',   'ethanwallace@yahoo.com',      100.00, '2025-05-14', 'sent'),
  ('Rachel Goldstein','rgoldstein@outlook.com',      500.00, '2024-12-02', 'sent'),
  ('Marcus Tran',     'marcus.tran92@gmail.com',      75.00, '2025-07-19', 'sent'),
  ('Isabelle Dupont', 'idupont.personal@icloud.com', 300.00, '2026-01-07', 'sent'),
  ('Andre Coleman',   'andrecoleman@gmail.com',       25.00, '2025-04-03', 'sent'),
  ('Nina Vasquez',    'ninavasquez88@yahoo.com',     125.00, '2024-09-30', 'sent'),
  ('Christopher Lee', 'clee.home@gmail.com',         250.00, '2025-11-06', 'sent'),
  ('Fatima Al-Hassan','fatima.alhassan@outlook.com',  50.00, '2025-06-22', 'sent'),
  ('Jordan Blake',    'jordanblake@icloud.com',      175.00, '2026-02-09', 'sent');
