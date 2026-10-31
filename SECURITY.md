# Security baseline

## Production environment

Set these Railway backend variables before deploying:

- `NODE_ENV=production`
- `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET`: two different random values, each at least 32 characters
- `JWT_ISSUER` and `JWT_AUDIENCE`: keep stable per deployment, for example `campusflow-api` and `campusflow-web`
- `FRONTEND_URL`: the exact HTTPS website origin, for example `https://campusflowlms.xyz`
- `CORS_ORIGINS`: comma-separated exact HTTPS origins when more than one frontend is used
- `ENABLE_SWAGGER=false`
- `RATE_LIMIT_PER_MINUTE=240`
- `AUTH_RATE_LIMIT=30`
- `DATABASE_MIGRATION_MODE=migrate` after the existing database has a Prisma migration history

Generate secrets locally with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Never commit `.env` files, passwords, card details, Firebase private keys, or JWT secrets.

## Protections enabled

- Helmet security headers on the API
- Strict allow-listed CORS with browser credentials disabled
- General request throttling and stricter authentication throttling
- Whitelisted and forbidden unknown request fields
- JSON and URL-encoded request bodies capped at 1 MB
- Hidden Express fingerprint and protected static-file defaults
- Production error responses no longer expose internal exception details
- Swagger is disabled by default in production
- New dashboard-created accounts require a strong password; known default passwords were removed
- Nginx security headers and a 260 MB upload ceiling for the frontend container
- Production JWTs are bound to a configured issuer and audience, and refresh tokens are checked against their owner and active account
- Profile password changes require the current password and revoke existing refresh sessions
- Frontend production builds send a Content-Security-Policy and cross-domain policy headers
- Database seed passwords must be supplied through `SEED_ADMIN_PASSWORD`, `SEED_TEACHER_PASSWORD`, and `SEED_STUDENT_PASSWORD`; no demo passwords are embedded in the seed script

Keep Railway, PostgreSQL, Firebase Storage, and the domain provider protected with separate accounts and 2FA. HTTPS/SSL must remain enabled at the hosting layer.

## Deployment security checklist

- Rotate any credential that has ever been pasted into chat, screenshots, source files, or browser forms. This includes database passwords, SMTP passwords, Telegram bot tokens, Google OAuth client secrets, and JWT secrets.
- Use separate Railway, Firebase, Google, domain, and email accounts with 2FA.
- Keep `MEDIA_STORAGE` on Firebase/Google Cloud for production and restrict the storage bucket to the application’s intended access pattern.
- Do not run `prisma db seed` in production. If seeding a non-production environment, set all `SEED_*_PASSWORD` variables first.
- Prefer `DATABASE_MIGRATION_MODE=migrate` in production. The compatibility fallback uses `prisma db push` without `--accept-data-loss` and will fail rather than silently dropping data.
- Review Railway logs and database access regularly; never expose `.env`, private keys, or service-account JSON files.
