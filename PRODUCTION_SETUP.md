# Production Setup Guide

## One-Time Setup Process

### Step 1: Configure Composio Webhook (You do this)
1. Go to: https://platform.composio.dev/?next_page=/settings/events
2. Set webhook URL to:
   ```
   https://16422830-728a-4299-a2a8-8d3b1b0d6508.worf.prod.repl.run/api/webhook/composio
   ```
3. Save the webhook secret (should already be in your environment)

### Step 2: Create Gmail Monitoring Trigger (One command)

After updating the webhook URL above, run this ONE command from your local machine:

```bash
curl -X POST https://16422830-728a-4299-a2a8-8d3b1b0d6508.worf.prod.repl.run/api/triggers/gmail/setup \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "replit",
    "config": {
      "labels": ["INBOX"],
      "interval": 1
    }
  }'
```

This creates a trigger that checks Gmail every 60 seconds for new emails.

### Step 3: That's it! 🎉

From now on:
- New claim emails arrive in Gmail → Automatically processed
- No manual API calls needed
- Claims appear in dashboard within 1 minute
- System tracks all status changes automatically

## How to Verify It's Working

1. Send a test claim email to your Gmail
2. Wait 60 seconds
3. Check dashboard - claim should appear automatically

## What Happens Automatically

When a claim-related email arrives:
- ✅ Composio detects it within 60 seconds
- ✅ Sends webhook to your app
- ✅ App fetches full email thread
- ✅ OpenAI extracts claim details and generates summary
- ✅ Claim saved to production database
- ✅ Dashboard updates immediately

## Why Manual API Calls Were Mentioned

The manual API calls (like `/api/process-thread`) are ONLY for:
- Testing without waiting for emails
- Processing historical emails
- Debugging specific cases

In normal production use, you'll NEVER need to call these manually - everything is automated!

## Monitoring Your System

Your production dashboard will show:
- Total claims processed
- Claims awaiting survey
- Overdue claims
- AI-generated summaries for each claim

## Support

If emails aren't being processed:
1. Check Composio trigger is active
2. Verify webhook URL is correct
3. Check your app logs for any errors