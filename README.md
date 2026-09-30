# FactoryTwin

This repository has two applications: `backend/` (NestJS, Prisma, PostgreSQL) and `frontend/` (React, Vite).

## Local authentication flow

Run the backend and frontend as described in their package scripts. The frontend uses `http://localhost:5173` and sends requests to `http://localhost:3000`. Keep both hosts as `localhost` (do not mix with `127.0.0.1`) so the auth cookie works in development.

Open the landing page at `http://localhost:5173/`. Registration creates a company and an OWNER user. Login/register set the server's HttpOnly `access_token` cookie; the frontend sends it with `credentials: "include"`. The backend already enables CORS credentials for the frontend origin. No JWT is stored in localStorage.

After registration, add a site at `/setup`, then open `/integrations` to test and browse OPC UA. A user needs the OWNER, ADMIN or TECHNICIAN role for the test/browse endpoints.

## Platform admin

`/admin` and `GET /platform-admin/overview` require `SUPER_ADMIN`. Public registration always creates OWNER. To activate an existing, trusted account for platform administration, set its role to `SUPER_ADMIN` directly in your development database (for example in Prisma Studio), then log out and back in so its JWT contains the updated role. Do not offer this role in public registration.

The current platform overview is read only and shows company counts. Company and site onboarding is available to customer OWNER accounts. Equipment, tag mappings and preview reads are restricted by company. Legacy telemetry, alarms and the demo WebSocket stream still require company isolation before a multi-customer production deployment.

## Equipment configuration

1. At `/integrations`, select a site, name the PLC connection, test it and save the integration.
2. Browse PLC variables, select the equipment tags and click Send Selected.
3. In the equipment configurator, enter the name, type and location. Rename metric labels, edit display units, select cards and use the arrows to set their order. The preview updates immediately. Read PLC Values reads actual selected tags; placeholders are shown until a successful read. Units only change the display label and do not convert raw values.
4. Save Equipment writes the equipment and its mapping in one transaction. The saved view at `/equipment/:id` reads values every five seconds, shows read quality and clears values when the PLC is unavailable. Reopen Edit Equipment to change the saved configuration.

The normal dashboard and asset registry list saved equipment belonging to the signed-in company. The previous fixed-ID demonstration dashboard remains at `/demo`. Configuration uses existing Prisma fields; no new database migration is required. The earlier unscoped demo assets have no company and are not automatically assigned to customer accounts.

The old background reader for the fixed `motor-m101` runs only when the backend environment has `ENABLE_LEGACY_DEMO_TELEMETRY=true`. It is off by default; configured equipment reads its own selected tags through the authenticated preview endpoint.

Configured equipment currently displays live values. Historical trends, equipment-specific alarm thresholds and predictive analysis will need to be connected to these real equipment IDs in the next stage.
