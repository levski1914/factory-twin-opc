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
3. In the equipment configurator, enter the name, type and location. Rename metric labels, edit display units, select cards and drag cards in the right-hand preview or use the arrows to set their order. Click Edit Card to change a card's PLC tag, meaning, label and unit. Selecting a tag already used elsewhere moves it into this card and removes the duplicate card. Power, voltage, energy, frequency, torque and runtime are available as metric meanings. Read PLC Values reads actual selected tags; placeholders are shown until a successful read. Units only change the display label and do not convert raw values.
4. Save Equipment writes the equipment and its mapping in one transaction. The saved view at `/equipment/:id` reads values every five seconds, shows read quality and clears values when the PLC is unavailable. Edit Equipment opens the whole configuration; Edit Card on a live card opens configuration with that card selected.

The normal dashboard and asset registry list saved equipment belonging to the signed-in company. The previous fixed-ID demonstration dashboard remains at `/demo`. Configuration uses existing Prisma fields; no new database migration is required. The earlier unscoped demo assets have no company and are not automatically assigned to customer accounts.

The old background reader for the fixed `motor-m101` runs only when the backend environment has `ENABLE_LEGACY_DEMO_TELEMETRY=true`. It is off by default; configured equipment reads its own selected tags through the authenticated preview endpoint.

Configured equipment currently displays live values. Historical trends, equipment-specific alarm thresholds and predictive analysis will need to be connected to these real equipment IDs in the next stage.


### Equipment alarm tags (October 2026)

After applying this update, run `npx prisma migrate deploy` and `npx prisma generate` from `backend/`, then restart the backend and frontend.

The equipment editor has a separate Alarm tags section. Browse the selected saved PLC in a new tab, send the desired tags, return to the original editor and click Import selected tags for alarms. Unsaved edits remain in the original tab. An alarm tag does not need a metric card. Save equipment to persist both lists together.

Rules support BOOL/0/1 states, numeric greater-than/less-than/equality, and bit indices 0–31 in a 32-bit integer word. Bad quality, missing readings and incompatible values display UNKNOWN. Live rules are evaluated only while the equipment view is open, at the existing five-second poll interval. Short pulses can be missed. There is no persistent alarm-event history, acknowledgement workflow, notification or PLC write in this update.

Copy alarm template lists other equipment of the same type in your company. It appends names, conditions and severity to the current draft, clearing source tag addresses. Bind each rule to the target machine's actual tag, then save. Existing equipment is never changed in bulk. A shared summary BOOL cannot identify which individual machine failed. Distinct instance members, array elements, bit positions or equipment-identifying codes require explicit mapping.

Up to 64 distinct node IDs across metric and alarm lists are read in one OPC UA batch. At least one metric remains required by the current equipment editor. Templates come from saved equipment; there is no separate template catalogue yet.


### Add more tags and remove unused connections

The equipment editor now contains Add more PLC tags. Browse PLC tags starts at Objects and lets you open folders/DBs, go back using the path, filter the current folder and add variables. New variables immediately become available for alarm selection and as unchecked metric rows; existing configuration is preserved. Exact NodeIds can also be entered and are read-checked against the selected integration before adding. Save equipment persists the selected metrics and alarm rules. This does not create or alter tags inside the PLC, and one equipment view still uses one PLC integration.

On the Integrations page, choose a saved connection to see Delete integration. Owners, admins and technicians can delete an unused connection after confirmation. The backend checks company ownership and blocks deletion if metric mappings or alarm rules reference it. No equipment or mapping is cascade-deleted. A saved endpoint is read-only to prevent accidental switching to a new connection while adding tags. This update requires no additional database migration beyond the alarm-tags update.


### Confirmed alarms and maintenance verification

See [the monitoring demo guide](docs/monitoring-demo.md) for migration steps, per-equipment configuration, the complete demonstration and operational limits. Monitoring is opt-in per asset; in-app notifications and maintenance events persist in PostgreSQL.
