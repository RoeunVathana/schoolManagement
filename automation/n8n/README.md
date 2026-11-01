# n8n monitoring process

`school-management-health-monitor.json` is an importable n8n workflow for the live Railway API.

It runs every five minutes and checks:

- API status and current deployment revision
- Redis cache readiness
- local media storage mode
- Railway volume attachment
- the exact persistent upload directory `/app/backend/uploads`

It sends one Telegram message when the state changes to unhealthy and one recovery message when it becomes healthy again. It does not spam a message every five minutes while the same outage continues.

## Configure once in n8n

Import the JSON, then provide these n8n environment variables on the n8n instance:

```text
N8N_TELEGRAM_BOT_TOKEN=<private Telegram bot token>
N8N_ALERT_CHAT_ID=<private admin chat id>
```

Keep both values in n8n's secret/environment configuration. Do not commit them to this repository. After importing and configuring the variables, activate the workflow.
