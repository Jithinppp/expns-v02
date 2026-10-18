# Expns — expense tracker

React Native (Expo SDK 58) + Supabase. Dark, lime-accented design system; offline-friendly client-generated UUIDs; budgets with automatic "you're close / you've exceeded" alerts.

## Stack

- **Expo SDK 58** / React Native 0.88 / **Expo Router** (file-based routes in `src/app`)
- **Supabase** — Postgres + Auth + Row Level Security
- Space Grotesk via `@expo-google-fonts/space-grotesk`
- `react-native-svg` for the striped progress bars and donut chart
- Session storage via `expo-sqlite`'s localStorage (no AsyncStorage needed)

## 1. Install

```bash
npm install
```

## 2. Supabase setup (one-time)

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Open **SQL Editor** and run the migrations **in order** (copy-paste each file's contents):
   - `supabase/migrations/20261018000001_core.sql` — profiles, accounts, categories, signup seeding, RLS
   - `supabase/migrations/20261018000002_ledger.sql` — recurring rules + transactions
   - `supabase/migrations/20261018000003_budgets_alerts.sql` — budgets, periods, alert triggers, notifications
   - `supabase/migrations/20261018000004_views_automation.sql` — views, RPCs, recurring cron, realtime
   - `supabase/migrations/20261018000005_month_carryover.sql` — month summary gains the carry-over balance
3. **Email verification page (recommended)**: deploy the static page in `verification/` — on Vercel: **Add New → Project**, import this repo, set **Root Directory** to `verification`, Deploy. Then wire it up: add the deployed URL (e.g. `https://expns-verify.vercel.app/**`) under **Auth → URL Configuration → Redirect URLs**, and set `EXPO_PUBLIC_EMAIL_REDIRECT_URL` in `.env.local`. Confirmation links then land on a branded "Email verified" page — on a phone its **Open Expns** button hands the verified session back to the app (in Expo Go the button works while the dev server is running — the email carries the `exp://` address automatically; a real build uses the `expns://` scheme). Password reset links open the same page, which shows a new-password form right in the browser — the reset email links to it directly with a token hash, so no app round-trip. Prefer the in-app screens only? Skip this step and add `expns://**` (plus `exp://**` while testing in Expo Go) to Redirect URLs instead. The **Site URL** can be anything — it's only the fallback.
4. **Auth → Providers → Email**: confirm email can stay **on** — clicking the link verifies the account (hosted page, or the app's own screen when no page is configured). Turning it **off** skips the email step entirely (faster local testing). Both paths work.
5. **Optional, for automatic recurring posts**: Database → **Extensions** → enable `pg_cron`, then re-run just the scheduling block at the end of `0004_views_automation.sql` (or run `select cron.schedule('expns-post-recurring', '0 1 * * *', 'select public.post_due_recurring()');`).
6. **Branded emails + deliverability**: paste `supabase/email-templates/confirm-signup.html` into **Auth → Email Templates → Confirm sign up** (subject: `Confirm your Expns account`) and `supabase/email-templates/reset-password.html` into **Reset password** (subject: `Reset your Expns password`) — its button links straight to your deployed `verification/` page, so edit that URL inside the template if the deployment changes. Note that Supabase's shared mailer only delivers to addresses on your Supabase team, is capped at 2 emails/hour, and often lands in Gmail spam. For real use, set up custom SMTP: create a [Resend](https://resend.com) account, verify a domain you own (add the SPF/DKIM/DMARC records it shows), then **Auth → SMTP Settings**: host `smtp.resend.com`, port `465`, user `resend`, password = your Resend API key, sender `no-reply@yourdomain`. Quick workaround until then: mark the email "Report not spam" once in Gmail.

## 3. Environment

Copy `.env.example` to `.env.local` and fill in:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...   # or the legacy anon key
EXPO_PUBLIC_EMAIL_REDIRECT_URL=https://expns-verify.vercel.app   # optional — verification page from step 3
```

Both Supabase values come from **Project Settings → API**. Only the publishable/anon key belongs in a mobile app — `service_role` bypasses RLS and must never ship. `EXPO_PUBLIC_EMAIL_REDIRECT_URL` is optional: set it to the deployed verification page, or leave it empty to deep-link confirmation emails into the app.

## 4. Run

```bash
npx expo start
```

- Press `a` / `i` for an emulator, or scan the QR with **Expo Go**.
- `expo-sqlite` and `react-native-svg` are bundled in Expo Go, so no development build is needed yet.
- If you get a "Supabase not connected" card, `.env.local` is missing values — fill it and restart the dev server.

## What's built

| Area | Status |
| --- | --- |
| Onboarding (3 slides, composed design visuals) → sign up / log in → dashboard | ✅ |
| Email confirmation: Supabase verifies the link, then the hosted page (`verification/`, deploy on Vercel) shows "Email verified" — on a phone it hands back to the app and signs you in | ✅ |
| Forgot password: reset email → hosted page shows a new-password form right in the browser (token-hash link + `verifyOtp`) → log in in the app with the new password | ✅ |
| Dashboard: month switcher, balance card (available = carried + monthly per month), income/expense bars, quick-add tiles, budgets with striped progress, spending donut, recent history | ✅ |
| Add expense / income: big inline amount field with the system keyboard, category & account chips, month-switchable date picker (backfill any past month), note | ✅ |
| Custom expense / income types: create your own with an emoji picker right from the add screen | ✅ |
| Transactions tab: month summary, search, day-grouped list, pull-to-refresh, tap or long-press a row to view & delete (soft delete, budgets adjust instantly) | ✅ |
| Budgets tab: per-category limits, weekly/monthly/yearly, alert threshold, live spent, long-press delete | ✅ |
| Recurring rules: created in Profile, auto-posted by `pg_cron` (daily 01:00 UTC), anchored to `start_on` to avoid month-end drift | ✅ (needs pg_cron enabled) |
| Alert inbox (bell) + `notifications` table with realtime | ✅ |
| Profile: edit name, currency (relabel-only, no conversion), accounts, recurring rules, sign out | ✅ |
| Push delivery (expo-notifications + Edge Function → Expo push) | later — `device_tokens` table is ready |
| Transfers UI — schema supports `account → to_account_id` one-row transfers | later |
| Edit transaction | later |

## How budget alerts work

Every transaction insert/update/soft-delete fires `on_transaction_change`, which adjusts `budget_periods.spent` for the matching category budget **and** the "all expenses" budget. When spending crosses the threshold (default 80%) or the limit, exactly **one** notification per period is written — flags reset if spending drops back below (e.g. after deleting a transaction), so alerts can fire again legitimately. The dashboard reads `budget_status` (a security-invoker view) for live progress.

## Project structure

```
src/
  app/                 # routes (Expo Router)
    onboarding.tsx     # 3-slide onboarding
    (auth)/            # login, signup
    (tabs)/            # dashboard, transactions, budgets, settings
    transaction/new.tsx# add transaction modal (custom keypad)
    notifications.tsx  # alert inbox
  components/          # design system (ui/) + app components
  constants/theme.ts   # palette, spacing, type scale
  lib/                 # supabase client, auth context, queries, formatting
supabase/migrations/   # run these in the SQL editor
```

## Useful commands

```bash
npx tsc --noEmit     # typecheck
npx expo lint        # lint
npx expo-doctor      # dependency/diagnosis
```
# expns-v02
