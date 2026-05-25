# Jefedes Lead Flow

Jefedes Lead Flow is a lead discovery and follow-up management application built for finding local businesses, organizing potential customer data, and tracking outreach status across the sales workflow.

The project combines a web dashboard, a backend API, local persistence, Google business discovery, map visualization, and WhatsApp-based follow-up flows.

## Purpose

The application helps teams:

- Search for businesses by category and location
- Review business contact information in a structured dashboard
- Track approval and outreach status for each business
- Manage WhatsApp template outreach
- Monitor incoming interest signals from WhatsApp interactions
- Keep lead lists organized for follow-up actions

## Main Features

- Business search by category, city, district, and result limit
- Business list with phone, website, address, rating, and map data
- Google Maps visualization for discovered businesses
- Lead status tracking
- WhatsApp outreach status tracking
- CSV export for search results
- Approved and rejected lead views
- Live support / interest request view
- Local SQLite persistence

## Tech Stack

### Frontend

- Next.js
- React
- TypeScript
- Tailwind CSS
- Google Maps JavaScript integration

### Backend

- Node.js
- Express
- SQLite
- WhatsApp Cloud API integration
- Google Places API integration

## Project Structure

```text
pazarlama-bot2/
  backend/
    app.js
    db.js
    data/
    scripts/
    services/
  frontend/
    app/
    components/
    lib/
    public/
    types/
```

## Frontend Overview

The frontend is a Next.js application that provides the main dashboard experience.

Important areas:

- `frontend/app`: application routes and pages
- `frontend/components`: reusable UI and workflow components
- `frontend/lib`: API clients and browser-side helpers
- `frontend/types`: shared frontend TypeScript types

Main screens include:

- Login page
- Lead search dashboard
- Approved leads
- Rejected leads
- Live support / interest requests
- Legal pages

## Backend Overview

The backend is an Express API responsible for:

- Business search orchestration
- Database initialization and persistence
- Lead status updates
- WhatsApp status updates
- WhatsApp template sending
- Webhook handling
- Live support lead management
- Authentication for the dashboard

Important areas:

- `backend/app.js`: API routes and application setup
- `backend/db.js`: SQLite schema, queries, and data helpers
- `backend/services`: external service integrations
- `backend/scripts`: local utility scripts

## Data Model Overview

The SQLite database stores the main application data.

Core entities:

- Users
- Searches
- Businesses
- Live support leads

Business records include contact details, source information, lead status, WhatsApp status, and recent interaction metadata.

## WhatsApp Workflow

The WhatsApp flow is designed around template-based outreach and reply tracking:

1. A user selects businesses from the dashboard.
2. A WhatsApp template can be sent to selected businesses.
3. The backend records the outbound template state.
4. Incoming WhatsApp replies can be received through webhook routes.
5. Relevant replies can update business outreach status.
6. Interest requests can appear in the live support view for follow-up.

## Google Integrations

The project uses Google services for:

- Business discovery through Google Places
- Map display in the frontend through Google Maps JavaScript API

API keys and provider credentials should be configured through environment variables and should never be committed to the repository.

## Environment Configuration

Environment-specific values are expected to be provided through local environment files or deployment platform settings.

Examples of required configuration categories:

- Backend API port
- Google API credentials
- WhatsApp Cloud API credentials
- Frontend public API base URL
- Frontend public Google Maps key

Do not commit real API keys, tokens, passwords, or production credentials.

## Development

Install dependencies separately for backend and frontend.

Backend:

```powershell
cd backend
npm install
npm run dev
```

Frontend:

```powershell
cd frontend
npm install
npm run dev
```

The frontend and backend are separate applications and should be run in separate terminal sessions during local development.

## Build

Frontend production build:

```powershell
cd frontend
npm run build
```

Backend syntax check:

```powershell
node --check backend/app.js
```

## Deployment Notes

Deployment depends on the target hosting setup.

Recommended deployment considerations:

- Keep frontend and backend environment variables separate
- Configure allowed origins for browser requests
- Configure Google API key restrictions for production domains
- Configure WhatsApp webhook URLs for the deployed backend
- Keep SQLite persistence strategy explicit for the production environment
- Avoid committing generated local database files

## Security Notes

- Never commit secrets or credentials
- Keep API keys restricted by domain, IP, or service where possible
- Use environment variables for provider credentials
- Treat webhook endpoints and tokens as sensitive integration points
- Avoid storing plaintext passwords

## License

This repository does not currently declare a public license.
