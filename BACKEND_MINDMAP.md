# Backend Architecture Mind Map

```
┌─────────────────────────────────────────────────────────────────┐
│                        ENTRY POINT                                │
│                    server/index.ts                                │
│  • Express app setup                                              │
│  • JSON body parsing                                              │
│  • Request logging middleware                                     │
│  • Error handling                                                 │
│  • Vite dev server (dev) / static files (prod)                   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ROUTING LAYER                               │
│                    server/routes.ts                             │
│                                                                  │
│  REST API Endpoints:                                             │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ GET  /api/claims              → List all claims           │   │
│  │ GET  /api/claims/:id          → Get single claim         │   │
│  │ GET  /api/stats               → Dashboard statistics      │   │
│  │ POST /api/process-thread      → Manual thread processing │   │
│  │ POST /api/process-gmail-thread → Process by threadId     │   │
│  │ POST /api/webhook/composio    → Gmail webhook handler    │   │
│  │ POST /api/triggers/gmail/setup → Setup Gmail trigger    │   │
│  │ GET  /api/triggers/:userId    → List triggers            │   │
│  │ POST /api/sync/fetch-recent   → Bulk sync from Gmail     │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SERVICES LAYER                                │
│              server/services/                                    │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ claimProcessor.ts (ORCHESTRATOR)                         │   │
│  │ • processNewThread() - Main entry point                 │   │
│  │ • processManualThread() - Testing entry point           │   │
│  │ • linkPendingThreads() - Retroactive linking            │   │
│  │ • getStats() - Dashboard stats                          │   │
│  │                                                          │   │
│  │ Flow:                                                     │   │
│  │   1. Fetch thread from Gmail                            │   │
│  │   2. Quick policy check (lightweight LLM)                │   │
│  │   3. If no policy → store in pending_threads            │   │
│  │   4. If policy → fetch ALL threads for that policy      │   │
│  │   5. Check pending_threads for matches                  │   │
│  │   6. Aggregate all threads                              │   │
│  │   7. Full extraction (heavy LLM)                        │   │
│  │   8. Upsert claim to database                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ emailProcessor.ts (GMAIL ADAPTER)                       │   │
│  │ • Uses Composio SDK for Gmail API                       │   │
│  │ • fetchThread() - Get single thread                     │   │
│  │ • listMessages() - List recent emails                   │   │
│  │ • fetchThreadsByPolicy() - Search by policy number      │   │
│  │ • normalizeThread() - Convert Gmail format → Normalized │   │
│  │ • threadToJson() - Format for LLM processing            │   │
│  │ • threadsToJson() - Aggregate multiple threads           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ policyExtractor.ts (LIGHTWEIGHT LLM)                      │   │
│  │ • extractPolicyNumber() - Fast check if policy exists    │   │
│  │ • Uses gpt-4o-mini (~50 tokens)                         │   │
│  │ • Returns: hasPolicyNumber, policyNumber, confidence     │   │
│  │ • Also extracts: consignee, commodity                    │   │
│  │ • Purpose: Gatekeeper before expensive extraction        │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ claimExtractor.ts (HEAVY LLM)                            │   │
│  │ • extractClaimData() - Full claim extraction             │   │
│  │ • Uses gpt-5-mini (~1000-1500 tokens)                   │   │
│  │ • Extracts:                                              │   │
│  │   - Identifiers (Gladstone ref, policy, client refs)     │   │
│  │   - Dates (notification, survey, PLA)                    │   │
│  │   - Metadata (branch, insurer, consignee, commodity)    │   │
│  │   - Status (calculated from lifecycle events)           │   │
│  │   - Summary (3-4 line plain English)                    │   │
│  │ • toInsertClaim() - Convert to DB format                │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ composioTriggers.ts (WEBHOOK HANDLER)                   │   │
│  │ • setupGmailTrigger() - Create polling trigger          │   │
│  │ • handleGmailWebhook() - Process incoming webhooks      │   │
│  │ • verifyWebhookSignature() - Security check             │   │
│  │ • isClaimRelatedEmail() - Filter non-claim emails      │   │
│  │ • Uses Composio v3 SDK                                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      STORAGE LAYER                               │
│                    server/storage.ts                            │
│                                                                  │
│  Database Operations (Drizzle ORM + Neon PostgreSQL):            │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Claims Operations                                         │   │
│  │ • getAllClaims()                                          │   │
│  │ • getClaim(id)                                            │   │
│  │ • getClaimByGladstoneRef()                               │   │
│  │ • getClaimByPolicyNumber()                               │   │
│  │ • findClaimsByClientRefs()                              │   │
│  │ • createClaim()                                          │   │
│  │ • updateClaim()                                          │   │
│  │ • upsertClaimByGladstoneRef() ← SMART MERGE LOGIC        │   │
│  │   - Tries Gladstone ref first                            │   │
│  │   - Falls back to policy number                          │   │
│  │   - Falls back to client refs                           │   │
│  │   - Merges data intelligently (preserves existing)      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Threads Operations                                        │   │
│  │ • getThreadsByPolicy()                                   │   │
│  │ • getThreadByThreadId()                                  │   │
│  │ • addThread() - Records threadId → policyNumber mapping   │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Pending Threads Operations                                │   │
│  │ • getAllPendingThreads()                                 │   │
│  │ • getPendingThreadByThreadId()                           │   │
│  │ • addPendingThread() - Store orphaned emails             │   │
│  │ • deletePendingThread() - Remove after linking          │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────────┬──────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DATA SCHEMA                                 │
│                  shared/schema.ts                               │
│                                                                  │
│  Database Tables (Drizzle ORM):                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ claims                                                    │   │
│  │ • id (UUID)                                              │   │
│  │ • gladstoneRef, policyNumber, clientRefs[]             │   │
│  │ • notificationReceivedAt, surveyDate, surveyDateFixedAt │   │
│  │ • plaForwardedInternallyAt                              │   │
│  │ • branch, insurer, consignee, commodity                │   │
│  │ • latestEmailDate, latestEmailSnippet                    │   │
│  │ • summary (AI-generated)                                │   │
│  │ • status (enum: 6 statuses)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ threads                                                    │   │
│  │ • id (UUID)                                              │   │
│  │ • threadId (Gmail thread ID, unique)                    │   │
│  │ • policyNumber (links to claim)                         │   │
│  │ • subject                                                │   │
│  │ • lastProcessedAt                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ pending_threads                                           │   │
│  │ • id (UUID)                                              │   │
│  │ • threadId (Gmail thread ID, unique)                   │   │
│  │ • subject, snippet                                       │   │
│  │ • consignee, commodity                                   │   │
│  │ • receivedAt                                            │   │
│  │ • threadData (JSONB - full thread data)                 │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    EXTERNAL DEPENDENCIES                         │
│                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐ │
│  │ Composio SDK     │  │ OpenAI API        │  │ Neon DB      │ │
│  │ @composio/core   │  │ openai            │  │ PostgreSQL   │ │
│  │                  │  │                   │  │              │ │
│  │ • Gmail API      │  │ • gpt-4o-mini     │  │ • Drizzle    │ │
│  │ • Triggers       │  │   (policy check)   │  │   ORM        │ │
│  │ • Webhooks       │  │ • gpt-5-mini      │  │ • Serverless │ │
│  │                  │  │   (full extract)   │  │              │ │
│  └──────────────────┘  └──────────────────┘  └──────────────┘ │
└─────────────────────────────────────────────────────────────────┘


┌─────────────────────────────────────────────────────────────────┐
│                    DATA FLOW (Main Path)                         │
│                                                                  │
│  1. Gmail Webhook → composioTriggers.handleGmailWebhook()      │
│                    ↓                                             │
│  2. Check if claim-related email                                │
│                    ↓                                             │
│  3. claimProcessor.processNewThread(threadId)                  │
│                    ↓                                             │
│  4. emailProcessor.fetchThread(threadId)                       │
│                    ↓                                             │
│  5. policyExtractor.extractPolicyNumber() [LIGHTWEIGHT]         │
│                    ↓                                             │
│  6a. NO POLICY → storage.addPendingThread()                     │
│      (Store for later linking)                                  │
│                    ↓                                             │
│  6b. HAS POLICY → emailProcessor.fetchThreadsByPolicy()         │
│                    ↓                                             │
│  7. Check pending_threads for retroactive matches               │
│                    ↓                                             │
│  8. Aggregate all threads → emailProcessor.threadsToJson()     │
│                    ↓                                             │
│  9. claimExtractor.extractClaimData() [HEAVY LLM]               │
│                    ↓                                             │
│  10. storage.upsertClaimByGladstoneRef()                        │
│                    ↓                                             │
│  11. Dashboard updates via /api/claims endpoint                │
└─────────────────────────────────────────────────────────────────┘
