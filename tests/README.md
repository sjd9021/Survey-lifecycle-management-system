# CLMS Test Suite

Comprehensive end-to-end tests for the Claim Lifecycle Management System.

## Test Structure

```
tests/
├── e2e/                    # End-to-end tests
│   ├── claim-processing.test.ts  # Core claim processing workflow
│   └── webhook.test.ts            # Webhook processing tests
├── integration/            # Integration tests
│   └── composio.test.ts           # Composio Gmail API integration
└── fixtures/               # Test data
    └── sample-claims.ts           # Sample claim data for testing
```

## Running Tests

### Prerequisites

1. **Environment Variables Required**:
   ```bash
   COMPOSIO_API_KEY=your_composio_key
   OPENAI_API_KEY=your_openai_key
   DATABASE_URL=your_database_url
   ```

2. **Optional (for real Gmail thread testing)**:
   ```bash
   TEST_THREAD_ID=19aa0ad990d5b065  # A real Gmail thread ID
   TEST_POLICY_NUMBER=2525MCAE018956  # A real policy number
   ```

### Run All Tests

```bash
npm test
```

### Run Specific Test Suites

```bash
# Integration tests only
npm run test:integration

# E2E tests only  
npm run test:e2e

# Watch mode (re-runs on file changes)
npm run test:watch

# With coverage report
npm run test:coverage
```

### Run Individual Test Files

```bash
# Composio integration tests
npx vitest tests/integration/composio.test.ts

# Claim processing tests
npx vitest tests/e2e/claim-processing.test.ts

# Webhook tests
npx vitest tests/e2e/webhook.test.ts
```

## Test Coverage

### Integration Tests (`tests/integration/composio.test.ts`)

- ✅ **fetchThread**: Verify Composio can fetch Gmail threads
- ✅ **fetchThreadsByPolicy**: Search for threads by policy number
- ✅ **threadToJson**: Convert thread to JSON for LLM processing
- ✅ **threadsToJson**: Aggregate multiple threads to JSON
- ✅ **Error handling**: Graceful handling of missing threads

### E2E Tests (`tests/e2e/claim-processing.test.ts`)

- ✅ **End-to-end processing**: Full workflow from Gmail → Database
- ✅ **Multi-thread aggregation**: Combine multiple emails per claim
- ✅ **Pending thread storage**: Store threads without policy numbers
- ✅ **Status detection**: Correctly identify lifecycle stages
- ✅ **AI summary generation**: Verify OpenAI summaries are generated
- ✅ **Database upsert**: Prevent duplicate claims on reprocessing

### Webhook Tests (`tests/e2e/webhook.test.ts`)

- ✅ **Signature verification**: Reject invalid webhook signatures
- ✅ **Webhook processing**: Handle Composio webhook payloads
- ✅ **Email filtering**: Skip non-claim emails
- ✅ **Webhook-to-claim flow**: Complete webhook → claim creation

## Example Test Output

```bash
$ npm test

✓ tests/integration/composio.test.ts (5)
  ✓ Composio Gmail Integration
    ✓ fetchThread should fetch a real Gmail thread using Composio
    ✓ threadToJson should convert normalized thread to JSON string
    ✓ threadsToJson should convert multiple threads to aggregated JSON

✓ tests/e2e/claim-processing.test.ts (6)
  ✓ End-to-End Claim Processing
    ✓ processNewThread should process a real Gmail thread end-to-end
    ✓ Multi-thread Aggregation should aggregate multiple threads
    ✓ Status Detection should correctly detect claim lifecycle status
    ✓ AI Summary Generation should generate plain-English summaries

✓ tests/e2e/webhook.test.ts (3)
  ✓ Webhook Processing
    ✓ should reject webhooks with invalid signature
    ✓ should process webhook and create/update claim

Test Files  3 passed (3)
     Tests  14 passed (14)
  Start at  11:45:23
  Duration  45.23s
```

## Debugging Tests

### Verbose Output

```bash
npx vitest --reporter=verbose
```

### Run Single Test

```bash
npx vitest -t "should fetch a real Gmail thread"
```

### Debug with Node Inspector

```bash
node --inspect-brk ./node_modules/.bin/vitest
```

## Test Data

The tests use:
- **Real Gmail threads** via `TEST_THREAD_ID` (requires actual Composio connection)
- **Mock fixtures** in `tests/fixtures/sample-claims.ts` for unit tests
- **Development database** (separate from production)

## Continuous Integration

To run tests in CI:

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test
    env:
      COMPOSIO_API_KEY: ${{ secrets.COMPOSIO_API_KEY }}
      OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
      DATABASE_URL: ${{ secrets.TEST_DATABASE_URL }}
```

## Common Issues

### Test Timeouts

If tests timeout, increase the timeout in `vitest.config.ts`:

```typescript
testTimeout: 120000, // 2 minutes
```

### Missing Environment Variables

Ensure all required env vars are set. Tests will fail immediately if missing:
- `COMPOSIO_API_KEY`
- `OPENAI_API_KEY`
- `DATABASE_URL`

### Gmail Thread Not Found

Use a valid `TEST_THREAD_ID` from your connected Gmail account. Find thread IDs by:
1. Check your Gmail inbox
2. Look at recent claim emails processed by the system
3. Use the thread ID from the URL or email headers
