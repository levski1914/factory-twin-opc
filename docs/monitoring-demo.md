# FactoryTwin: confirmed alarms and repair verification

This update follows `factory-twin-alarm-trends.patch` (all earlier equipment/alarm updates are required).

## Install

From the project root, apply the patch with `git am .\factory-twin-monitoring-workflow.patch`.
Then from `backend` run:

```powershell
npx prisma migrate deploy
npx prisma generate
```

Restart the backend and frontend. No new npm dependencies are required. Existing equipment is not automatically enrolled: enable monitoring explicitly per asset in Edit equipment.

## Configure the PLC demonstration

Use your existing test motor and real OPC UA variables. This update does not write to the PLC or create simulated incidents in the UI.

1. In Edit equipment, add the running/speed and load tags through Add more PLC tags if needed. They need not be enabled as metric cards.
2. Enable Continuous monitoring & repair verification.
3. Select `Motor_Running` with TRUE/1, or select your speed tag and an appropriate greater-than threshold.
4. Select `Motor_Load_PCT` and set a meaningful minimum load (for example, greater than 10 for a test motor using a percentage tag).
5. Set the stable verification window to 15 seconds for the demo.
6. Bind an alarm BOOL (TRUE/1), or configure a numeric temperature threshold. Example test setup: temperature >100, recovery threshold 95, confirmation 10 seconds, recovery stable for 5 seconds. These example limits are not equipment ratings.
7. Save equipment. Running/load criteria are used for repair verification; initial alarm confirmation follows the configured alarm rule regardless of running state.

Choose appropriate limits before triggering the scenario. Open tasks lock equipment configuration until verification passes, preserving the rules used to evaluate the incident. There is no supervisor cancellation/override flow in this first version.

## Demonstration sequence

- Short spike: keep the deviation shorter than the confirmation time, then restore it. The detail border turns orange and the rule displays pending progress. The timer resets on a normal reading; no maintenance case/notification is created.
- Sustained fault: keep the deviation beyond 10 seconds of valid sampled observations. The alarm becomes confirmed, the border reflects severity, and one open maintenance case is created for the asset.
- Open Maintenance. A TECHNICIAN, ADMIN or OWNER can accept the task and describe a repair. In-app notifications go to company OWNER/ADMIN/TECHNICIAN users on confirmation, and to OWNER/ADMIN plus the assignee for workflow updates. Other technicians cannot report repairs on an assigned task; OWNER/ADMIN can.
- Report a repair while the fault persists and the motor is running under the configured load. After 10 seconds of persistent confirmed fault during the post-report check, status becomes VERIFICATION_FAILED. Management receives a factual notification naming the person who reported the work. The task stays open.
- Report the follow-up repair. Restore the signal, keep the motor running under load, wait for the alarm recovery delay and then the 15-second stable verification window. The task becomes RESOLVED with measurement evidence.
- If the motor is stopped, insufficiently loaded or data quality is bad, verification waits. It cannot pass from zero readings caused by stopping the motor.
- Close the browser during a fault: the backend keeps collecting and recording tasks/notifications. Reopening the app shows the stored results.

## What is implemented

The backend reads each enrolled asset in a non-overlapping cycle, with a one-second pause after each complete cycle. Actual cadence depends on PLC/network response and number of assets. Confirmation uses elapsed time across valid samples; gaps above five seconds or bad-quality samples reset pending confirmation/recovery/verification windows. A confirmed alarm remains latched through unknown data until recovery can be verified. The UI reads stored backend snapshots rather than independently evaluating confirmed alarms.

Cases, workflow events, evidence snapshots and per-user in-app notifications are stored in PostgreSQL. Reporting a repair never directly closes a task. PostgreSQL advisory transaction locks and a unique open-case key serialize concurrent changes for an asset. All new read/write endpoints scope data to the authenticated company; notification read receipts also require the recipient user.

The same roles used by the app define recipients; OWNER is the management/CEO demo account. This update does not create additional users or a configurable organization chart, send email/SMS, or issue PLC control commands.

## Limits

- This is a deterministic, evidence-based workflow. No AI model/LLM is connected, and no prediction of remaining useful life is claimed.
- Passed verification means the configured signals and operating conditions passed. It is not proof that all mechanical defects were repaired, nor proof of a person's intent.
- OPC UA is polled. Excursions between samples can be missed; the system does not prove uninterrupted analog conditions between reads. Existing PLC protection remains independent.
- The backend must be running and connected to PostgreSQL/PLC. Samples while the backend is stopped are not reconstructed. Pending time is restarted after a long gap; cases and notifications survive restarts.
- This first collector reads assets sequentially and opens an OPC UA session per sample. A slow/unreachable PLC can delay other assets. Use the single-PLC demo first; connection pooling, subscriptions and per-PLC workers are follow-up work.
- Persistent data consists of the latest snapshot and event evidence, not a complete historian. Trend charts still retain their current browser session only.
- Notifications are in-app and require viewing the app to see them; an unread notification is stored while the browser is closed.
- The UI shows the latest 100 maintenance cases and 50 notifications. Full archive pagination is not yet implemented.

## Verification performed

TypeScript/frontend and Nest backend builds; unit tests for delays, short spikes, hysteresis, bad-quality samples, signal loss, load criteria and stable recovery; mocked backend workflow covering confirmation, claim, unsuccessful repair, stopped equipment, successful repair, evidence and tenant/assignee authorization.

The migration and the full UI/PLC workflow still require validation against your local PostgreSQL and PLC setup. No live database or PLC was available in the development workspace.

## Monitoring setup and repeated task actions

The equipment editor labels monitoring as “Watch this equipment and notify the team”. Running feedback and working-load selection are separate from alarm rules. Numeric running/load limits and verification duration are in expandable settings; the effective criteria remain visible in the review summary. The initial load value is in the selected tag's units and must be reviewed for each machine. Tag-name warnings are hints, not validation of PLC types.

Alarm setup separates PLC boolean flags, measured-value limits, and code/bit rules. Switching source type clears the old tag selection. Existing rules retain their settings.

Repeated CLAIM requests from the current assignee on an IN_PROGRESS task return the existing task without another event or notification. The UI immediately displays the returned state and guards double submission. Resuming a failed repair and a supervisor taking over remain real transitions. Historical duplicate notifications are retained and can be marked read. No database migration is required for this update.
