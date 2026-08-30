# Sheet Plan

Internal shop-floor planner for Allegra Philadelphia. Staff describe a print job and/or upload a file; the app returns a production **PLAN** (press, parent sheet to buy, n-up, cuts, click-saving why). v1 does **not** quote print-job dollars.

Staff Mail Advisor lives at [`/mail/`](https://AllegraPhilly.github.io/sheet-plan/mail/) and [`/staff/mail-advisor/`](https://AllegraPhilly.github.io/sheet-plan/staff/mail-advisor/). It is not a customer chatbot.

## Live

- **Now (before DNS):** https://AllegraPhilly.github.io/sheet-plan/
- **Mail Advisor:** https://AllegraPhilly.github.io/sheet-plan/mail/
- **After DNS:** https://bearcublodge.com (same app; CNAME in repo)

Static GitHub Pages only. No Vercel. No Node server in production. `output: 'export'`. Planner, mail advisor, and file inspect run in the browser. No `/api` routes.

## Nav

Planner · Mail Advisor · Floor list. INTERNAL watermark. `robots` noindex. No Allegra franchise wordmark. No Fiery IP/hostname. No meter serials or USPS account IDs in the UI.

## Develop

```bash
npm ci
npm test
npm run build
```

Notice 123 cells are hardcoded, effective **2026-07-12**. Missing cells say see Notice 123 — rates are never invented.

Permit/CRID commercial Marketing Mail and First-Class presort are **not open**. Those cells show as once-eligible with `shop_blockers: permit_not_open`. Actionable now: metered FCM, EDDM-Retail, tabbed self-mailers.

MAILBOT is email only and is never assigned USPS mailing.
