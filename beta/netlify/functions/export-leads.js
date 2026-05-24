// netlify/functions/export-leads.js
// Downloads all leads as a CSV file.
// Protected by a secret token to prevent public access.
//
// Environment variable required:
//   ADMIN_TOKEN  — any secret string you choose, e.g. "mysecret123"
//
// Usage: GET /api/export-leads?token=mysecret123
// Opens a downloadable CSV of all signups.

const { getStore } = require('@netlify/blobs');

exports.handler = async function(event) {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  // Auth check
  const token       = event.queryStringParameters && event.queryStringParameters.token;
  const ADMIN_TOKEN = process.env.ADMIN_TOKEN;

  if (!ADMIN_TOKEN || token !== ADMIN_TOKEN) {
    return { statusCode: 401, body: 'Unauthorized' };
  }

  try {
    const store = getStore('leads');
    const { blobs } = await store.list();

    const rows = [];
    rows.push(['email','market','account_size','risk_pct','risk_amount','position_size','signed_up_at'].join(','));

    for (const blob of blobs) {
      try {
        const lead = await store.get(blob.key, { type: 'json' });
        if (!lead) continue;
        rows.push([
          csvEscape(lead.email         || ''),
          csvEscape(lead.market        || ''),
          csvEscape(lead.account_size  || ''),
          csvEscape(lead.risk_pct      || ''),
          csvEscape(lead.risk_amount   || ''),
          csvEscape(lead.position_size || ''),
          csvEscape(lead.signed_up_at  || ''),
        ].join(','));
      } catch(_) {}
    }

    const csv = rows.join('\n');

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="leads-${new Date().toISOString().slice(0,10)}.csv"`,
      },
      body: csv,
    };
  } catch (err) {
    console.error('Export error:', err);
    return { statusCode: 500, body: 'Export failed: ' + err.message };
  }
};

function csvEscape(val) {
  const s = String(val);
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}
