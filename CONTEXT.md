# Astrologer Studio - Project Context for AI Assistants

> This file provides context for AI assistants and LLMs working with this codebase.
> Format follows the emerging CONTEXT.md convention for vendor-agnostic AI context.

## Project Identity

- **Name**: Astrologer Studio
- **Type**: Professional astrology workspace web application
- **License**: AGPLv3 (GNU Affero General Public License v3)
- **Primary Language**: TypeScript
- **Repository**: https://github.com/g-battaglia/AstrologerStudio
- **Live Instance**: https://astrologerstudio.com

## Core Purpose

An open-source web application for professional astrologers to:

- Generate precise astrological charts (natal, transit, synastry, composite, solar/lunar returns)
- Manage client/subject databases with birth data
- Explore ephemeris and transit timelines
- Get optional AI-powered interpretations

## Technology Stack

| Layer            | Technology                                 |
| ---------------- | ------------------------------------------ |
| Framework        | Next.js 16 (App Router)                    |
| Runtime          | Bun / Node.js                              |
| Language         | TypeScript 5.x                             |
| UI               | React 19, Tailwind CSS, Shadcn UI          |
| Database         | PostgreSQL + Prisma ORM                    |
| State            | TanStack React Query, Zustand              |
| Auth             | Custom JWT sessions, optional Google OAuth |
| Astrology Engine | Kerykeion via Astrologer API               |
| AI               | OpenRouter with AI SDK                     |
| Payments         | Dodo Payments (optional)                   |

## Project Structure

```
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── (protected)/        # Authenticated routes (dashboard, charts)
│   │   ├── (public)/           # Public pages (landing, auth)
│   │   ├── admin/              # Admin dashboard (separate auth)
│   │   └── api/                # API routes
│   ├── actions/                # Server Actions (auth, subjects, astrology)
│   ├── components/             # React components (UI, charts, forms)
│   ├── hooks/                  # React Query hooks and view-models
│   ├── lib/                    # Utilities, API clients, helpers
│   │   ├── astrologer-api.ts   # Astrology calculation API client
│   │   ├── session.ts          # JWT session management
│   │   └── security/           # Security utilities (CSRF, rate limiting)
│   ├── stores/                 # Zustand stores (UI state)
│   └── types/                  # TypeScript type definitions
├── prisma/
│   ├── schema.prisma           # Database schema
│   └── migrations/             # Database migrations
├── docs/                       # User-facing documentation
├── LIBDOCS/                    # Internal technical documentation
├── scripts/                    # CLI utilities (create users, import)
└── public/                     # Static assets
```

## Key Files

### Configuration

- `package.json` - Dependencies and scripts
- `.env.example` - Environment variables template
- `prisma/schema.prisma` - Database models
- `next.config.mjs` - Next.js configuration with CSP headers

### Entry Points

- `src/app/layout.tsx` - Root layout with providers
- `src/app/(protected)/layout.tsx` - Authenticated layout with sidebar
- `src/app/(protected)/page.tsx` - Main dashboard (Now Chart)

### Core Logic

- `src/lib/astrologer-api.ts` - Astrologer API client (chart calculations)
- `src/actions/astrology.ts` - Server actions for chart generation
- `src/actions/subjects.ts` - Subject/client CRUD operations
- `src/actions/auth.ts` - Authentication logic

### Database Models (Prisma)

- `User` - User accounts with subscription info
- `Subject` - Birth chart subjects (clients)
- `ChartPreferences` - User chart rendering preferences
- `SavedChart` - Saved chart configurations
- `AdminUser` - Separate admin authentication

## Development Commands

```bash
# Development
bun install              # Install dependencies
bun run dev              # Start dev server (localhost:3000)

# Database
bun run db:up            # Start PostgreSQL via Docker
bun run db:generate      # Generate Prisma client
bun run db:migrate       # Run migrations
bun run db:studio        # Open Prisma Studio

# User Management
bun run user:create -- <username> <password>

# Code Quality
bun run lint             # ESLint
bun run type-check       # TypeScript check
bun run format           # Prettier
```

## Architecture Patterns

### Data Flow

1. **Client** → React Query hooks (`src/hooks/`)
2. **Hooks** → Server Actions (`src/actions/`)
3. **Actions** → Prisma (DB) or Astrologer API (calculations)

### Authentication

- Custom credentials auth with bcrypt password hashing
- Optional Google OAuth (feature-flagged)
- JWT sessions stored in encrypted cookies
- Separate admin authentication system

### Chart Generation

- All astrological calculations via external Astrologer API
- API client: `src/lib/astrologer-api.ts`
- Server actions merge user preferences with API requests
- Charts rendered as interactive SVGs

### Caching Strategy

- React Query for client-side data caching
- Custom localStorage caches for ephemeris and transits
- Server-side AI interpretation caching in PostgreSQL

## Environment Variables

Key variables (see `.env.example` for complete list):

```bash
# Required
DATABASE_URL=postgresql://...
SESSION_SECRET=<random-32-chars>
ASTROLOGER_API_KEY=<astrologer-api-key>

# Optional Features
NEXT_PUBLIC_ENABLE_AI_INTERPRETATION=true
NEXT_PUBLIC_ENABLE_GOOGLE_OAUTH=false
NEXT_PUBLIC_ENABLE_EMAIL_REGISTRATION=true
```

## Code Conventions

- **Components**: PascalCase, co-located with page or in `src/components/`
- **Hooks**: `use` prefix, in `src/hooks/`
- **Server Actions**: Exported async functions in `src/actions/`
- **Types**: Centralized in `src/types/`, Zod schemas for validation
- **Styling**: Tailwind CSS with Shadcn UI components

## Common Modifications

### Adding a new page

1. Create route in `src/app/(protected)/your-page/page.tsx`
2. Add navigation link in `src/components/SidebarNav.tsx`

### Adding a new chart type

1. Add API method in `src/lib/astrologer-api.ts`
2. Create server action in `src/actions/astrology.ts`
3. Create view component in `src/app/(protected)/_components/`

### Modifying database schema

1. Edit `prisma/schema.prisma`
2. Run `bun run db:migrate` (creates migration)
3. Run `bun run db:generate` (updates client)

## Related Documentation

- [README.md](./README.md) - Project overview and quick start
- [DEVELOPMENT.md](./DEVELOPMENT.md) - Detailed development guide
- [docs/DATABASE.md](./docs/DATABASE.md) - Database setup and migrations
- [docs/SELF_HOSTING.md](./docs/SELF_HOSTING.md) - Self-hosting guide
- [LIBDOCS/CORE_FUNCTIONALITIES.md](./LIBDOCS/CORE_FUNCTIONALITIES.md) - Feature deep-dive

## External Dependencies

- **Astrologer API**: Chart calculations (requires RapidAPI key or self-hosted)
- **GeoNames**: Location lookup for birth data
- **OpenRouter**: AI interpretations (optional)
- **Dodo Payments**: Subscription billing (optional)

---

_Last updated: 2026-01-15_
