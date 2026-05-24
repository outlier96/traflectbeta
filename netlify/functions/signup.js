// netlify/functions/signup.js
// Handles beta signups: validates input, stores lead in Netlify Blobs, sends notification via Resend.
//
// Environment variables to set in Netlify dashboard → Site → Environment variables:
//   RESEND_API_KEY   — from resend.com (free tier: 3,000 emails/month)
//   NOTIFY_EMAIL     — your email address to receive signup notifications
//   FROM_EMAIL       — verified sender address in Resend (e.g. noreply@yourdomain.com)
//
// Resend is free and requires no credit card for the free tier.
// Sign up at https://resend.com and verify a domain or use their sandbox.

const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  // Only accept POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Parse body (JSON or form-encoded)
  let data = {};
  try {
    const ct = event.headers['content-type'] || '';
    if (ct.includes('application/json')) {
      data = JSON.parse(event.body);
    } else {
      const params = new URLSearchParams(event.body);
      params.forEach((v, k) => { data[k] = v; });
    }
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid request body' }) };
  }

  // Honeypot check
  if (data['bot-field'] && data['bot-field'].trim() !== '') {
    // Silently accept to fool bots
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  // Validate
  const email = (data.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid email address' }) };
  }

  const market       = data.market       || 'unknown';
  const accountSize  = data.account_size || '';
  const riskPct      = data.risk_pct     || '';
  const riskAmount   = data.risk_amount  || '';
  const positionSize = data.position_size|| '';
  const signedUpAt   = new Date().toISOString();

  // ── 1. Store in Netlify Blobs ──────────────────────────────────────────────
  // Each lead is stored as leads:<email-safe-key>
  // You can view/export these from the Netlify dashboard → Blobs
  try {
    const store = getStore('leads');
    const key   = email.replace(/[^a-z0-9._-]/g, '_');

    // Check for duplicate
    let existing = null;
    try { existing = await store.get(key, { type: 'json' }); } catch(_) {}
    if (existing) {
      // Already signed up — still return success, just don't double-notify
      return { statusCode: 200, body: JSON.stringify({ ok: true, duplicate: true }) };
    }

    await store.set(key, JSON.stringify({
      email,
      market,
      account_size:  accountSize,
      risk_pct:      riskPct,
      risk_amount:   riskAmount,
      position_size: positionSize,
      signed_up_at:  signedUpAt,
    }));
  } catch (blobErr) {
    console.error('Blob store error:', blobErr);
    // Don't fail the whole request if blob storage fails — still try to email
  }

  // ── 2. Send notification email via Resend ─────────────────────────────────
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  const NOTIFY_EMAIL   = process.env.NOTIFY_EMAIL;
  const FROM_EMAIL     = process.env.FROM_EMAIL || 'noreply@resend.dev';

  if (RESEND_API_KEY && NOTIFY_EMAIL) {
    try {
      const emailBody = `
New beta signup!

Email:         ${email}
Market:        ${market}
Account size:  $${accountSize}
Risk %:        ${riskPct}%
Risk amount:   $${riskAmount}
Position size: ${positionSize}
Signed up:     ${signedUpAt}
      `.trim();

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from:    FROM_EMAIL,
          to:      [NOTIFY_EMAIL],
          subject: `[Beta] New signup: ${email} (${market})`,
          text:    emailBody,
        }),
      });
    } catch (emailErr) {
      console.error('Resend error:', emailErr);
      // Don't fail — lead is already saved to blob store
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
