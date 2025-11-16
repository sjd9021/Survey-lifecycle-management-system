# Claim Lifecycle Management System (CLMS)

## Overview

The Claim Lifecycle Management System is an automated tracking platform for marine and cargo insurance claims. The system monitors email activity to track claim progression through various lifecycle stages, eliminating the need for manual Excel tracking. It processes email threads from branch offices, insurers, brokers, and consignees to maintain a single source of truth for all claim-related events and statuses.

## User Preferences

Preferred communication style: Simple, everyday language.

## Quick Start

### Setting up Gmail Triggers (v3 Composio SDK)

1. **Configure webhook URL** in [Composio Dashboard](https://platform.composio.dev/?next_page=/settings/events):
   - Webhook URL: `https://your-replit-app.replit.app/api/webhook/composio`
   - Get webhook secret and set as `COMPOSIO_WEBHOOK_SECRET` environment variable

2. **Create a trigger** for a user:
   ```bash
   curl -X POST http://localhost:5000/api/triggers/gmail/setup \
     -H "Content-Type: application/json" \
     -d '{
       "userId": "user@example.com",
       "config": {
         "labels": ["INBOX"],
         "subject": "claim"
       }
     }'
   ```

3. **Incoming emails** matching the filter will automatically:
   - Trigger webhook to `/api/webhook/composio`
   - Fetch full email thread from Gmail
   - Extract claim data using OpenAI
   - Upsert claim to PostgreSQL database
   - Update dashboard in real-time

### Manual Thread Processing

For testing or one-off processing without triggers:

```bash
curl -X POST http://localhost:5000/api/process-thread \
  -H "Content-Type: application/json" \
  -d @thread.json
```

## System Architecture

### Frontend Architecture

**Framework**: React with TypeScript using Vite as the build tool

**UI Component System**: 
- Shadcn/ui components built on Radix UI primitives
- Fluent Design System principles for enterprise productivity workflows
- Design emphasizes information density, scannable data tables, and minimal context switching

**Styling Approach**:
- Tailwind CSS with custom theme configuration
- CSS variables for dynamic theming (light/dark mode support)
- Spacing system based on consistent units (2, 4, 6, 8)
- Custom color system with HSL values for semantic color tokens

**State Management**:
- TanStack Query (React Query) for server state management
- Local React state for UI interactions
- No global state management library (Redux, Zustand, etc.)

**Routing**: Wouter for lightweight client-side routing

**Key Design Patterns**:
- Component composition with Radix UI slot pattern
- Custom hooks for reusable logic (use-mobile, use-toast)
- Path aliases for clean imports (@/, @shared/, @assets/)
- Progressive disclosure - summary views with expand-on-demand details

### Backend Architecture

**Runtime**: Node.js with Express.js framework

**Language**: TypeScript with ESM modules

**API Design**:
- RESTful endpoints under `/api` prefix
- JSON request/response format
- Middleware for request logging and error handling

**Core Services**:
1. **Gmail Client** (`gmailClient.ts`) - Manages Gmail API authentication via Replit integration
2. **Email Processor** (`emailProcessor.ts`) - Fetches and normalizes Gmail thread data
3. **Claim Extractor** (`claimExtractor.ts`) - Uses OpenAI to extract claim data from email threads
4. **Claim Processor** (`claimProcessor.ts`) - Orchestrates email processing and claim upsert logic
5. **Composio Trigger Service** (`composioTriggers.ts`) - Manages v3 SDK triggers and webhooks
6. **Storage Layer** (`storage.ts`) - Database abstraction with interface-based design

**Data Processing Pipeline**:
- **Automated**: Gmail webhook → Composio trigger → Fetch thread → OpenAI extraction → Database upsert → Dashboard update
- **Manual**: POST /api/process-thread → Normalize thread → OpenAI extraction → Database upsert

### Data Storage

**Database**: PostgreSQL via Neon serverless driver

**ORM**: Drizzle ORM for type-safe database operations

**Schema Design**:
- `users` table - Authentication (username/password)
- `claims` table - Core claim tracking with lifecycle timestamps
  - Unique constraint on `gladstoneRef` (primary claim identifier)
  - Array field for `clientRefs` (BL numbers, PI numbers, policy numbers)
  - Timestamp fields for each lifecycle event (notification, survey, PLA)
  - Status field with predefined values (NOTIFIED, SURVEY_SCHEDULED, PLA_SENT)
  - Metadata fields (branch, insurer, consignee, commodity)

**Migration Strategy**: Drizzle Kit for schema migrations in `/migrations` directory

### External Dependencies

**Third-Party Services**:

1. **OpenAI API** (Required)
   - Purpose: LLM-based extraction of claim data from unstructured email threads
   - Used by: `server/services/claimExtractor.ts`
   - Configuration: `OPENAI_API_KEY` environment variable
   - Note: System will not process emails without this key

2. **Neon Database** (Required)
   - Purpose: Serverless PostgreSQL hosting
   - Configuration: `DATABASE_URL` environment variable
   - Package: `@neondatabase/serverless`

3. **Composio v3 SDK** (Implemented)
   - Purpose: Gmail webhook triggers for automated email monitoring
   - Package: `composio-core@latest`
   - Implementation: `server/services/composioTriggers.ts`
   - Configuration: `COMPOSIO_API_KEY`, `COMPOSIO_WEBHOOK_SECRET`
   - Features:
     - Automated Gmail trigger creation and management
     - Webhook signature verification for security
     - Smart email filtering (claim-related emails only)
     - Real-time claim processing from incoming emails
   - Documentation: https://docs.composio.dev/docs/using-triggers

4. **Google Gmail API** (Integrated via Replit)
   - Purpose: Fetch email threads programmatically
   - Package: `googleapis`
   - Implementation: `server/services/gmailClient.ts`
   - Status: Fully integrated using Replit's Google Mail connection
   - Connection ID: `conn_google-mail_01KA6NWR7CM7QA6BEPMPGXT6KR`
   - Permissions: Read messages, send emails, manage labels

**UI Component Libraries**:
- Radix UI - Headless accessible components (18+ packages)
- Lucide React - Icon system
- date-fns - Date formatting and manipulation
- React Hook Form + Zod - Form validation (installed but not actively used)

**Development Tools**:
- Vite plugins for Replit integration (@replit/vite-plugin-*)
- TypeScript strict mode enabled
- ESBuild for server bundle optimization

**Authentication**: 
- Session-based (connect-pg-simple for PostgreSQL session storage)
- Currently has user schema but no active authentication implementation

**Environment Variables Required**:
- `DATABASE_URL` - Neon PostgreSQL connection string
- `OPENAI_API_KEY` - OpenAI API key for claim extraction
- `COMPOSIO_API_KEY` - Composio API key for trigger management (optional for manual processing)
- `COMPOSIO_WEBHOOK_SECRET` - Webhook signature verification secret (recommended for production)
- `NODE_ENV` - Environment mode (development/production)
- `REPLIT_CONNECTORS_HOSTNAME` - Auto-configured by Replit for Gmail integration
- `REPL_IDENTITY` or `WEB_REPL_RENEWAL` - Auto-configured by Replit for authentication