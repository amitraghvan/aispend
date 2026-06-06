import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Adjust this value in production, or use tracesSampler for finer control
  tracesSampleRate: 0.1,

  // Setting this option to true will print useful information to the console if you're triggering dev issues.
  debug: false,
});
