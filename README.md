# Sheet Plan

Internal shop-floor planner for Allegra Philadelphia. Staff describe a print job and/or upload a file; the app returns a production **PLAN** (press, parent sheet to buy, n-up, cuts, click-saving why). v1 does **not** quote print-job dollars.

Staff Mail Advisor lives at [`/mail/`](https://AllegraPhilly.github.io/sheet-plan/mail/) and [`/staff/mail-advisor/`](https://AllegraPhilly.github.io/sheet-plan/staff/mail-advisor/). It is not a customer chatbot.

## Live

- **Intended (before DNS):** https://AllegraPhilly.github.io/sheet-plan/
- **Mail Advisor:** https://AllegraPhilly.github.io/sheet-plan/mail/
- **Staff alias:** https://AllegraPhilly.github.io/sheet-plan/staff/mail-advisor/
- **After DNS:** https://bearcublodge.com (same app; `public/CNAME` is `bearcublodge.com`)

The static site is already on `main` and on the `gh-pages` branch. GitHub Actions builds and publishes it. **Pages itself is still off** — the Actions token cannot flip that switch (API 403). A repo admin must do this once:

1. Open [Settings → Pages](https://github.com/AllegraPhilly/sheet-plan/settings/pages)
2. **Source:** GitHub Actions (preferred), or Deploy from a branch → `gh-pages` / `/`
3. Save. Do not add `allegraphilly.com`. Custom domain is `bearcublodge.com`.

After that click, `https://AllegraPhilly.github.io/sheet-plan/` and `/mail/` go live. Re-run **Test and GitHub Pages** if the first Actions deploy ran before Pages was on.

Static GitHub Pages only. No Vercel. No Node server in production. `output: 'export'`. Planner, mail advisor, and file inspect run in the browser. No `/api` routes.

## Nav

Planner · Mail Advisor · Floor list. Small INTERNAL pill (Caveat Bold). `robots` noindex. Allegra 2026 shop-floor colors (purple #522E90, sky #408EB2, red #EE3E42, gold #FCBA30, green #26A046) and Roboto. Header uses the official 4-color standalone A plus Roboto “Sheet Plan” — not the ALLEGRA wordmark, not MARKETING • PRINT • MAIL. Footer: Independently owned and operated. No Trajan. No Fiery IP/hostname. No meter serials or USPS account IDs in the UI.

## Develop

```bash
npm ci
npm test
npm run build
```

Notice 123 cells are hardcoded, effective **2026-07-12**. Missing cells say see Notice 123 — rates are never invented.

Permit/CRID commercial Marketing Mail and First-Class presort are **not open**. Those cells show as once-eligible with `shop_blockers: permit_not_open`. Actionable now: metered FCM, EDDM-Retail, tabbed self-mailers.

MAILBOT is email only and is never assigned USPS mailing.
