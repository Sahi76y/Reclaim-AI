# ReclaimAI — AI Revenue Recovery Agent

ReclaimAI is an AI-powered revenue recovery platform built for the Razorpay AI Builder challenge. It detects revenue at risk from failed transactions, abandoned checkouts, and payment gateway issues, recommends targeted recovery interventions, strictly validates every action against merchant safety guardrails, and executes recovery operations exclusively in Razorpay test mode with a full, immutable audit trail.

---

## Current Development Status

**Phase:** Step 2 — Synthetic Revenue-Risk Dataset & Ingestion  
**Status:** Completed & Verified (14 Unit Tests Passing)

The synthetic revenue-risk dataset generator, evaluation ground-truth isolation layer, repository data-access layer, and webhook ingestion pipeline have been implemented. 1,000 deterministic records across all 6 payment risk categories are seeded for benchmark evaluation.

> **Important Architecture & Safety Rules:**
>
> 1. Ground truth recovery labels (`isRecoverable`, `recoverableAmount`, `expectedRecoveryAction`) are strictly isolated in `EventGroundTruth` and never exposed as AI input features.
> 2. No autonomous AI recovery execution or real financial transfers are enabled. All actions remain guarded.

---

## The ReclaimAI Workflow

```text
Revenue at Risk
  │
  ▼
AI Diagnosis
  │
  ▼
Recovery Recommendation
  │
  ▼
Policy / Safety Validation (Guardrail Check)
  │
  ▼
Razorpay Test-Mode Action
  │
  ▼
Webhook / Outcome
  │
  ▼
Revenue Recovered
  │
  ▼
Audit Trail
```

---

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org/) (App Router, React 19)
- **Language:** [TypeScript 5](https://www.typescriptlang.org/) (Strict Mode)
- **Styling:** [Tailwind CSS v4](https://tailwindcss.com/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/) design system (Card, Badge, Button, AppShell)
- **Database & ORM:** [PostgreSQL](https://www.postgresql.org/) with [Prisma ORM](https://www.prisma.io/)
- **Schema Validation:** [Zod](https://zod.dev/)
- **Analytics & Visualizations:** [Recharts](https://recharts.org/)
- **Linting & Formatting:** ESLint & Prettier with Tailwind plugin

---

## Folder Structure

```text
reclaimai/
├── app/                          # Next.js App Router
│   ├── globals.css               # Financial design tokens & Tailwind styles
│   ├── layout.tsx                # Root layout with AppShell wrapper
│   └── page.tsx                  # Dashboard & ReclaimAI overview placeholder
├── components/
│   ├── layout/                   # Layout components
│   │   ├── app-shell.tsx         # Combined Shell (Header + Sidebar + Content)
│   │   ├── header.tsx            # Financial ops header with test mode pills
│   │   └── sidebar.tsx           # Platform navigation sidebar
│   └── ui/                       # Accessible UI primitives
│       ├── badge.tsx             # Status, severity & guardrail badges
│       ├── button.tsx            # Styled action buttons
│       └── card.tsx              # Elevated financial card
├── lib/
│   ├── env.ts                    # Zod-validated environment configuration
│   ├── prisma.ts                 # PrismaClient singleton instance
│   └── utils.ts                  # Classnames merge helper (`cn`)
├── prisma/
│   └── schema.prisma             # PostgreSQL schema with domain models
├── server/                       # Modular business logic stubs
│   ├── ai/                       # AI diagnosis & recommendation engine
│   ├── audit/                    # Immutable audit logging engine
│   ├── policy/                   # Guardrail & policy validation layer
│   ├── razorpay/                 # Razorpay Test-Mode API client
│   └── recovery/                 # Safe recovery orchestration
├── types/
│   └── index.ts                  # Domain TypeScript interfaces
├── .env.example                  # Documented environment template
├── .env                          # Local development environment file
├── .prettierrc                   # Prettier formatting configuration
├── components.json               # shadcn/ui configuration
├── package.json                  # Dependencies and scripts
└── tsconfig.json                 # TypeScript compiler configuration
```

---

## Environment Variables

Copy `.env.example` to `.env` (already done for initial setup):

```bash
cp .env.example .env
```

| Variable                    | Description                                            | Default / Example                                                       |
| :-------------------------- | :----------------------------------------------------- | :---------------------------------------------------------------------- |
| `NODE_ENV`                  | Application runtime environment                        | `development`                                                           |
| `NEXT_PUBLIC_APP_URL`       | Base URL for the application                           | `http://localhost:3000`                                                 |
| `DATABASE_URL`              | PostgreSQL connection string                           | `postgresql://postgres:postgres@localhost:5432/reclaimai?schema=public` |
| `RAZORPAY_KEY_ID`           | Razorpay Key ID (**Test Mode Only**)                   | `rzp_test_placeholder_key_id`                                           |
| `RAZORPAY_KEY_SECRET`       | Razorpay Key Secret (**Test Mode Only**)               | `placeholder_secret`                                                    |
| `RAZORPAY_WEBHOOK_SECRET`   | Secret used to sign test webhooks                      | `placeholder_webhook_secret`                                            |
| `SAFETY_GUARDRAILS_ENABLED` | Global safety kill-switch                              | `true`                                                                  |
| `POLICY_ENFORCEMENT_MODE`   | Policy enforcement severity (`strict` or `permissive`) | `strict`                                                                |

> 🔒 **Security Notice:** Never commit real API keys or secrets to version control. Razorpay keys must always be `rzp_test_...` credentials.

---

## Local Setup Instructions

### 1. Prerequisites

- Node.js 18+ (tested on Node v22)
- npm 9+

### 2. Install Dependencies

```bash
npm install
```

### 3. Generate Prisma Client

```bash
npm run prisma:generate
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser to access the ReclaimAI operations shell.

### 5. Quality Checks

```bash
# Type check
npm run typecheck

# Lint check
npm run lint

# Validate Prisma schema
npx prisma validate

# Code formatting check
npm run format:check
```

---

## Roadmap & Next Steps

1. **Step 2:** Synthetic Dataset & Revenue Risk Ingestion (Mock webhook events, failed payments, abandonment)
2. **Step 3:** AI Diagnosis & Recovery Recommendation Engine
3. **Step 4:** Policy Engine & Guardrail Validation (Human-in-the-loop triggers)
4. **Step 5:** Razorpay Test-Mode Execution & Webhook Reconciliation
5. **Step 6:** Real-time Recovery Dashboard & Financial Analytics
