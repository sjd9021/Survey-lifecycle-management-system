# Quick Start - Testing Guide

## Run Tests Immediately

```bash
# Make test script executable (one-time)
chmod +x run-tests.sh

# Run all tests
./run-tests.sh

# Or use npx directly
npx vitest run
```

## Set Test Environment Variables (Optional)

For testing with real Gmail threads:

```bash
export TEST_THREAD_ID="19aa0ad990d5b065"
export TEST_POLICY_NUMBER="2525MCAE018956"
```

## Quick Test Commands

```bash
# Run with verbose output
npx vitest run --reporter=verbose

# Run specific test file
npx vitest run tests/integration/composio.test.ts

# Watch mode (auto-rerun on changes)
npx vitest

# UI mode (visual test runner)
npx vitest --ui
```

## What Gets Tested

✅ **Composio Integration** - Gmail API connection via Composio  
✅ **Thread Fetching** - Fetch single and multiple email threads  
✅ **Claim Processing** - End-to-end email → database workflow  
✅ **AI Extraction** - OpenAI summary generation  
✅ **Webhook Handling** - Composio webhook processing  
✅ **Status Detection** - Lifecycle stage identification  

## Test Output Example

```
✓ tests/integration/composio.test.ts (5)
✓ tests/e2e/claim-processing.test.ts (6)
✓ tests/e2e/webhook.test.ts (3)

Test Files  3 passed (3)
     Tests  14 passed (14)
```

## Troubleshooting

**Tests timeout?**  
→ Increase timeout in `vitest.config.ts` or add to specific test:
```typescript
it("test name", async () => {
  // test code
}, 120000); // 2 minutes
```

**Environment variables missing?**  
→ Check that `COMPOSIO_API_KEY`, `OPENAI_API_KEY`, and `DATABASE_URL` are set

**Thread not found?**  
→ Use a valid thread ID from your connected Gmail account

See `tests/README.md` for complete documentation.
