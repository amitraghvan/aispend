# DEMO_MODE_ROOT_CAUSE.md

## Root Cause Analysis
The application was falling back to "Demo Mode" because client-side components in Next.js cannot read environment variables from the server unless they are prefixed with `NEXT_PUBLIC_`.
- The root `.env` defined `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- The environment schema validator in `src/validators/env.ts` validated `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
- However, client-side files like `src/lib/supabase/client.ts` retrieved `process.env.NEXT_PUBLIC_SUPABASE_URL` and `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Because the `NEXT_PUBLIC_` versions were not defined, they resolved to `undefined` in the browser client.
- This triggered `isSupabaseConfigured() === false`, which caused the app to fall back to a mock login path that wrote to/read from `localStorage` under `aispend_mock_session` and displayed the "Demo mode — Supabase not configured. Login is simulated." banner.

Additionally, the URL for `SUPABASE_URL` in `.env` mistakenly had `/rest/v1/` appended to the end, which is incorrect for standard Supabase client initialization.

## Actions Taken & Code Removed/Added

### 1. Environment Handling Fixed
- Modified `.env` to define:
  ```env
  NEXT_PUBLIC_SUPABASE_URL="https://yxfjpxwwsatbyegvqmmh.supabase.co"
  NEXT_PUBLIC_SUPABASE_ANON_KEY="sb_publishable_yy2g0TLHyPrxWohL8w_f_g_w64N2z3y"
  ```
- Modified `.env.example` to use `NEXT_PUBLIC_` prefixes.
- Updated `src/validators/env.ts` to validate `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`.

### 2. Client & Server Initializers Strict Error Handling
- Modified `src/lib/supabase/client.ts` to throw `new Error('Supabase configuration missing')` instead of falling back to returning `null` or returning a silent `false`.
- Modified `src/lib/supabase/server.ts` to throw `new Error('Supabase configuration missing')` on server-side if variables are missing.
- Modified `src/lib/supabase/middleware.ts` to throw `new Error('Supabase configuration missing')` in middleware if variables are missing.

### 3. Removed Demo Mode Mock Code and UI
- **Auth Context (`src/lib/auth/auth-context.tsx`)**: Removed the `localStorage` fallback path in `fetchSession` and `logout`. Now always triggers the API-based session fetch and real Supabase sign-out.
- **Login (`src/app/(auth)/login/page.tsx`)**: Removed simulated credentials check/localStorage bypass and deleted the Amber "Demo mode" warning banner.
- **Signup (`src/app/(auth)/signup/page.tsx`)**: Removed simulated signup/localStorage bypass and deleted the Amber "Demo mode" warning banner.
- **Forgot Password (`src/app/(auth)/forgot-password/page.tsx`)**: Removed `isSupabaseConfigured` mock check.
- **Reset Password (`src/app/(auth)/reset-password/page.tsx`)**: Removed `isSupabaseConfigured` mock check.
- **Audits Endpoint (`src/app/api/audits/route.ts`)**: Removed fallback list of mock audits in GET.
- **Copilot Endpoints**: Removed the `isSupabaseConfigured` check from all copilot APIs so they require session authentication unconditionally.

## Verification Evidence
- **Vitest Suite**: Run `npm test` verified that all 320/320 tests pass cleanly without regression.
- **Next.js Production Build**: Verified production compilation build passes cleanly.
