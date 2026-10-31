# Encrypted Telegram database backup

This worker creates a PostgreSQL dump, compresses it, encrypts it with AES-256-GCM, and uploads the encrypted file to a private Telegram chat. It sends a separate success or failure message. It never sends the database dump in plain text.

## Railway setup

Create a separate Railway service from this repository and set its Dockerfile path to `backup-telegram/Dockerfile`. Configure it as a cron service with:

```text
0 2 * * 0
```

Railway schedules are UTC, so this runs at 09:00 Cambodia time every Sunday. The service exits after each run.

Set these variables in Railway. Do not commit them or paste them into chat:

```text
DATABASE_URL=${{Postgres.DATABASE_URL}}
TELEGRAM_BOT_TOKEN=<BotFather token>
TELEGRAM_CHAT_ID=<private chat or private channel id>
BACKUP_ENCRYPTION_KEY=<base64-encoded 32-byte key>
BACKUP_CHUNK_MB=45
```

Generate a key locally with Node.js:

```text
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Store the encryption key in a password manager. Without it, a Telegram file cannot be restored. Keep the Telegram chat private, enable Telegram 2-step verification, and do not add unknown members or bots.

Telegram currently limits newly uploaded documents to 50 MB, so the worker splits larger encrypted backups into 45 MB parts. Reassemble the parts in order before decrypting.
