# FactoryTwin

This repository has two applications: `backend/` (NestJS, Prisma, PostgreSQL) and `frontend/` (React, Vite).

## Local authentication flow

Run the backend and frontend as described in their package scripts. The frontend uses `http://localhost:5173` and sends requests to `http://localhost:3000`. Keep both hosts as `localhost` (do not mix with `127.0.0.1`) so the auth cookie works in development.

Open the landing page at `http://localhost:5173/`. Registration creates a company and an OWNER user. Login/register set the server's HttpOnly `access_token` cookie; the frontend sends it with `credentials: "include"`. The backend already enables CORS credentials for the frontend origin. No JWT is stored in localStorage.

After registration, add a site at `/setup`, then open `/integrations` to test and browse OPC UA. A user needs the OWNER, ADMIN or TECHNICIAN role for the test/browse endpoints.

## Platform admin

`/admin` and `GET /platform-admin/overview` require `SUPER_ADMIN`. Public registration always creates OWNER. To activate an existing, trusted account for platform administration, set its role to `SUPER_ADMIN` directly in your development database (for example in Prisma Studio), then log out and back in so its JWT contains the updated role. Do not offer this role in public registration.

The current platform overview is read only and shows company counts. Company and site onboarding is available to customer OWNER accounts. Existing telemetry and tag mapping endpoints predate tenant isolation; restrict those by company before exposing the application to unrelated customers.
