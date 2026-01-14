# Astrologer Studio

Astrologer Studio is a professional astrology workspace built with Next.js, Shadcn UI and the Astrologer API.  
It lets astrologers manage subjects/clients, generate high‑precision charts, explore ephemeris and get AI‑assisted interpretations.

## Highlights

- **All main chart types** – natal, transits, synastry, composite, solar return, lunar return, "now" chart and timeline.
- **Subject database** – store people with full birth data, locations, notes, tags and Rodden ratings.
- **Interactive charts** – SVG charts with themes, dark mode and configurable points/aspects.
- **Ephemeris & timeline tools** – yearly ephemeris tables/charts and a transit timeline with filters.
- **AI interpretations (optional)** – streaming readings powered by Astrologer API context + OpenRouter.
- **PostgreSQL database** – Uses Prisma ORM with PostgreSQL for all environments.

## Getting Started

### Prerequisites

- [Bun](https://bun.sh/) ≥ 1.0 (recommended runtime)
- Node.js ≥ 18 (for tooling/IDE support)
- A PostgreSQL database
- Astrologer API (see below)

### Astrologer API

Astrologer Studio requires the **Astrologer API** for all astrological calculations. You have two options:

#### Option A: RapidAPI (Recommended)

The easiest way — use the hosted API:

1. Go to [RapidAPI - Astrologer API](https://rapidapi.com/gbattaglia/api/astrologer)
2. Subscribe to the **Free plan** (or a paid plan for higher limits)
3. Copy your API key and add it to `.env` as `RAPIDAPI_KEY`

#### Option B: Self-Host the API

Run your own instance of the API:

1. Clone the repository: [github.com/g-battaglia/Astrologer-API](https://github.com/g-battaglia/Astrologer-API)
2. Follow the setup instructions in the repository
3. Set `ASTROLOGER_API_URL` in `.env` to your API URL (e.g., `http://localhost:8000/api/v5`)

### 1. Clone and Install

```bash
git clone https://github.com/g-battaglia/AstrologerStudio.git
cd AstrologerStudio

bun install
```

### 2. Configure Environment

Copy `.env.example` and adjust values:

```bash
cp .env.example .env
```

Key variables:

- `DATABASE_URL` – PostgreSQL connection string.
- `SESSION_SECRET` – strong random string for session encryption.
- `RAPIDAPI_KEY` – Astrologer API key from RapidAPI.
- `GEONAMES_USERNAME` – GeoNames username for location lookup.
- `OPENROUTER_API_KEY` – OpenRouter API key for AI interpretations (optional).
- `NEXT_PUBLIC_ENABLE_AI_INTERPRETATION` – master switch for AI readings.

See `.env.example` for all available configuration options.

### 3. Initialize the Database

```bash
bun run db:generate   # Generate Prisma Client
bun run db:migrate    # Run migrations
```

### 4. Create Accounts

#### Create a User Account

```bash
bun run public-repo/create-user.ts --username <name> --password <pass> [options]
```

**Options:**

| Option       | Required | Description                                                              |
| :----------- | :------- | :----------------------------------------------------------------------- |
| `--username` | Yes      | The account username                                                     |
| `--password` | Yes      | The account password (min 8 characters)                                  |
| `--email`    | No       | Account email address                                                    |
| `--plan`     | No       | Subscription plan: `free`, `trial`, `pro`, `lifetime` (default: `trial`) |

**Examples:**

```bash
# Create a trial user
bun run public-repo/create-user.ts --username john --password "Pass1234!"

# Create a user with email
bun run public-repo/create-user.ts --username jane --password "Pass1234!" --email jane@example.com

# Create a lifetime user
bun run public-repo/create-user.ts --username vip --password "Pass1234!" --plan lifetime
```

#### Create an Admin Account

```bash
bun run public-repo/create-admin.ts --username <name> --password <pass> [options]
```

**Options:**

| Option       | Required | Description                                |
| :----------- | :------- | :----------------------------------------- |
| `--username` | Yes      | The admin username                         |
| `--password` | Yes      | The admin password (min 8 characters)      |
| `--email`    | No       | Admin email address                        |
| `--role`     | No       | `admin` or `superadmin` (default: `admin`) |

**Role Differences:**

- **admin**: Can view statistics and manage regular users
- **superadmin**: Can also manage other admins and delete users

**Examples:**

```bash
# Create an admin
bun run public-repo/create-admin.ts --username admin --password "AdminPass123!"

# Create a superadmin
bun run public-repo/create-admin.ts --username superadmin --password "SuperPass123!" --role superadmin
```

> **Note:** Admin accounts log in at `/admin/login`, not the regular `/login` page.

### 5. Run the Dev Server

```bash
bun run dev
```

Open `http://localhost:3000` and log in with the user you created.

## Scripts

| Command               | Description                       |
| :-------------------- | :-------------------------------- |
| `bun run dev`         | Start Next.js dev server.         |
| `bun run build`       | Build the app for production.     |
| `bun run start`       | Start the production server.      |
| `bun run lint`        | Run ESLint.                       |
| `bun run db:generate` | Regenerate Prisma Client.         |
| `bun run db:migrate`  | Run dev migrations.               |
| `bun run db:deploy`   | Deploy migrations (staging/prod). |
| `bun run db:studio`   | Open Prisma Studio.               |

## License

This project is licensed under the AGPL-3.0 License. See the [LICENSE](LICENSE) file for details.
