README.md
# SafeExit — Travel with a Plan B

SafeExit is a personal safety companion for travellers in India. It brings together:

- **Trip overview** – a home screen showing your next trip and shortcuts to every tool.
- **My trips** – add trips with a destination, dates, place to stay, trusted contact and notes. From any trip you can start a live safety session or build a Plan B in one tap.
- **Live safety** – a private link that expires automatically, with latest-location sharing, check-in deadlines, SOS alerts and a trusted-contact dashboard.
- **Verify a message** – a text-based check for warning signs in booking and payment messages.
- **Plan B protocol** – a contingency card for when plans change.
- **Discreet help** – private phrases and next steps you can use when you need help.

## Tech

- Static HTML, CSS and vanilla JavaScript in `public/` (no build step for the front-end)
- Netlify Functions (`netlify/functions`) for `/api/safety` and `/api/trips`
- Netlify Database (managed Postgres) through Drizzle ORM (`db/schema.ts`). Migrations live in `netlify/database/migrations` and are applied automatically on deploy.

## Running locally

```bash
npm install
netlify dev
```

Then open the URL the CLI prints. After changing `db/schema.ts`, run `npx drizzle-kit generate --name <change_name>` to create a migration.
