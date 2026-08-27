import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildReceiptMessage,
  messageToHtml,
} from './receiptTemplate.js';

describe('messageToHtml', () => {
  it('preserves plain-text line breaks without stacking paragraph margins', () => {
    const message = buildReceiptMessage({
      amount: 10,
      first_name: 'Jefferson',
    });
    const html = messageToHtml(message);

    assert.equal(html.includes('<p>'), false);
    assert.match(html, /^<div style="[^"]*">/);
    assert.match(html, /<\/div>$/);

    assert.equal(
      html,
      '<div style="margin:0;line-height:1.5;">' +
        'Dear Jefferson,<br><br>' +
        'The C&amp;W Market Foundation has received your generous gift of $10.00 to support our annual efforts.<br><br>' +
        'All of us at the C&amp;W Market Foundation appreciate our donors. We are very grateful for your contribution!<br><br>' +
        'With gratitude,<br><br>' +
        'Clarence and Wendy Weaver<br>' +
        'Co-Founders<br><br>' +
        'Sydni Craig<br>' +
        'Board President' +
        '</div>'
    );
  });

  it('escapes HTML special characters in message text', () => {
    const html = messageToHtml('Hello <script> & "friends"');
    assert.equal(
      html,
      '<div style="margin:0;line-height:1.5;">Hello &lt;script&gt; &amp; &quot;friends&quot;</div>'
    );
  });
});
