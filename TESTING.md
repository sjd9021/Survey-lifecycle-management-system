# Testing Guide for CLMS

## Quick Test with Example Claims

The system has been tested with two real-world email scenarios. You can reproduce these tests using the provided script:

### Running the Test Script

```bash
cd test-data
./process-examples.sh
```

This script will:
1. Process the Chubb claim (policy 13901027002) - a 52-day delayed survey case
2. Process the Fujikura claim (policy FUJIKURA-2024-088) - an orphaned thread scenario
3. Display the resulting claims in the database
4. Show updated statistics

### Expected Results

#### Chubb Claim (13901027002)
- **Status**: SURVEY_SCHEDULED
- **Summary**: Mentions door damage, electronics, BL MAEU123456789, Port of Los Angeles, survey scheduled for Nov 20, 2024
- **Key Dates**:
  - Notification: Sept 27, 2024
  - Survey scheduled: Nov 20, 2024
- **Demonstrates**: Multi-thread aggregation (3 emails spanning 52 days)

#### Fujikura Claim (FUJIKURA-2024-088)
- **Status**: NOTIFIED
- **Summary**: Mentions wet condition, optical fiber cables, container TCLU9876543, waiting for survey confirmation
- **Key Dates**:
  - Notification: Nov 15, 2024
  - Survey: Not yet scheduled
- **Demonstrates**: Orphaned thread handling (policy number appears later in thread)

## Manual Testing via API

### 1. Process a Manual Thread

```bash
curl -X POST http://localhost:5000/api/process-thread \
  -H "Content-Type: application/json" \
  -d '{
    "threadText": "Your email thread content here..."
  }'
```

### 2. Process a Gmail Thread (requires Gmail integration)

```bash
curl -X POST http://localhost:5000/api/process-gmail-thread \
  -H "Content-Type: application/json" \
  -d '{
    "threadId": "gmail-thread-id-here"
  }'
```

### 3. View All Claims

```bash
curl http://localhost:5000/api/claims
```

### 4. View Statistics

```bash
curl http://localhost:5000/api/stats
```

## Dashboard Testing

1. Navigate to the dashboard at `http://localhost:5000/`
2. Verify the stats cards show:
   - Total Claims
   - Awaiting Survey
   - Survey Scheduled
   - Overdue
3. Check the claims table displays:
   - Policy numbers prominently
   - AI-generated summaries (3-4 lines)
   - Status badges with appropriate colors
   - Survey dates
4. Click "View Details" on a claim to see the full modal
5. Verify no runtime errors appear

## Integration Testing

### Setting up Gmail Webhook (Production)

1. Configure Composio webhook URL in dashboard
2. Create Gmail trigger:
```bash
curl -X POST http://localhost:5000/api/triggers/gmail/setup \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "replit",
    "config": {
      "labels": ["INBOX"],
      "interval": 1
    }
  }'
```

3. Send a test email to the monitored inbox
4. Verify the webhook is triggered and claim is processed

## Test Data Files

- `test-data/chubb-thread.txt` - Chubb door damage claim (52-day delay)
- `test-data/fujikura-thread.txt` - Fujikura wet condition claim (orphaned thread)
- `test-data/process-examples.sh` - Automated test script

## What to Look For

### Multi-thread Aggregation
- System should combine emails from different senders (branch, Ronnie, surveyor)
- Policy number should link all related threads
- Summary should reference events from all threads

### Orphaned Thread Handling
- Early emails without policy numbers should be stored in pending_threads
- When policy appears later, pending threads should be linked
- LLM should fuzzy-match related threads

### AI Summary Quality
- Summaries should be 3-4 lines
- Plain English, no technical jargon
- Should mention: commodity, loss type, key dates, current status, next steps

### Status Detection
- NOTIFIED: Claim received, survey not requested
- WAITING_FOR_SURVEY_APPOINTMENT: Survey requested, date not confirmed
- SURVEY_SCHEDULED: Survey date confirmed
- SURVEY_OVERDUE: >2 days since notification, no survey date
- PLA_SENT: Survey report forwarded internally
- PLA_OVERDUE: >12 hours since survey, no PLA forwarded

### Overdue Calculation
- Survey overdue: 2 calendar days from notification
- PLA overdue: 12 hours from survey date
- Status should auto-update based on timestamps
