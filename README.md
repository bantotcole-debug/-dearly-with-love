# Dearly, with love ♡

A Next.js + Supabase starter for an anonymous letter wall.

## 1. Local setup

```bash
npm install
cp .env.example .env.local
npm run dev
```

Put your Supabase **Project URL** and **Publishable key** in `.env.local`. Never put a Supabase secret/service-role key in a `NEXT_PUBLIC_` variable or in this repository.

## 2. Database

In Supabase, open SQL Editor and run `supabase/migrations/001_dearly_schema.sql`.

Public visitors can only read approved letters. Public writes are performed by Edge Functions using the server-side service-role key.

## 3. Edge Functions

Deploy these functions from the Supabase CLI or Dashboard:
- `submit-letter`
- `react-heart`
- `report-letter`

Set a random secret named `RATE_LIMIT_SALT` for the functions. Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to Edge Functions; never expose the service-role key in browser code.

Example CLI commands:

```bash
supabase functions deploy submit-letter
supabase functions deploy react-heart
supabase functions deploy report-letter
supabase secrets set RATE_LIMIT_SALT="replace-with-a-long-random-value"
```

## 4. Moderation

New letters are always stored with `status = 'pending'`. Review them in Supabase Table Editor (`public.letters`) and change `status` to `approved` or `rejected`. Only approved letters are visible publicly. Restrict dashboard access to trusted moderators.

## 5. GitHub and Vercel

Upload the project files to your GitHub repository, then import that repository in Vercel. Add the two `NEXT_PUBLIC_...` variables in Vercel Project Settings → Environment Variables, then redeploy.

## Important launch checklist

This is a starter implementation, not a complete production moderation product. Before inviting the public:
- Add Cloudflare Turnstile (or equivalent CAPTCHA) verification to all public write functions.
- Improve rate limiting using a trusted edge/network IP source and monitor abuse.
- Add authenticated admin tooling with server-verified moderator roles; do not rely on a hidden admin URL.
- Consider content moderation review tooling and a retention/privacy policy.
- A browser-stored visitor token limits duplicate hearts per browser profile, not per human; clearing storage or changing devices can create another token.
