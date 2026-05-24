# Position Size Calculator — Private Beta

A working private beta: calculator + lead capture that actually saves signups
and emails you every time someone joins.

---

## What's inside

```
beta/
├── index.html                      The calculator + signup gate
├── package.json                    Dependencies (@netlify/blobs)
├── netlify.toml                    Build + function + redirect config
└── netlify/
    └── functions/
        ├── signup.js               POST /api/signup  — saves lead, sends email
        └── export-leads.js         GET  /api/export-leads?token=X  — downloads CSV
```

---

## Deploy (5 minutes)

### Step 1 — Push to GitHub
```bash
git init
git add .
git commit -m "init"
gh repo create my-calculator --private --push --source=.
```

### Step 2 — Connect to Netlify
1. Go to https://app.netlify.com → Add new site → Import from Git
2. Pick your repo. Build settings are auto-detected from netlify.toml.
3. Click **Deploy site**.

### Step 3 — Get a free Resend account (for email notifications)
1. Go to https://resend.com → sign up free (3,000 emails/month, no card)
2. Add and verify your domain (or use the sandbox for testing)
3. Go to API Keys → Create API Key → copy it

### Step 4 — Set environment variables in Netlify
Netlify dashboard → Your site → Site configuration → Environment variables → Add:

| Variable        | Value                              |
|-----------------|------------------------------------|
| `RESEND_API_KEY` | Your Resend API key               |
| `NOTIFY_EMAIL`   | Your email (to receive signups)   |
| `FROM_EMAIL`     | Verified sender e.g. noreply@yourdomain.com |
| `ADMIN_TOKEN`    | Any secret string e.g. abc123xyz  |

Then **Deploys → Trigger deploy → Deploy site** to pick up the new variables.

---

## Using it

### Signups
Every time someone submits the form:
- Their data is saved to **Netlify Blobs** (built-in key-value store, free)
- You receive an **email notification** via Resend with their details
- Duplicate emails are silently ignored

### Export all leads as CSV
Visit:
```
https://yoursite.netlify.app/api/export-leads?token=YOUR_ADMIN_TOKEN
```
Downloads a CSV with: email, market, account_size, risk_pct, risk_amount, position_size, signed_up_at

### View leads in Netlify dashboard
Netlify dashboard → Your site → Blobs → leads store

---

## Testing locally
```bash
npm install -g netlify-cli
npm install
netlify dev
```
Then open http://localhost:8888. The functions run locally.
Set env vars with a `.env` file (never commit it):
```
RESEND_API_KEY=re_xxxx
NOTIFY_EMAIL=you@example.com
FROM_EMAIL=noreply@yourdomain.com
ADMIN_TOKEN=mysecret123
```

---

## Free tier limits
- Netlify Functions: 125,000 invocations/month
- Netlify Blobs: 1 GB storage
- Resend: 3,000 emails/month
- All free, no credit card required
