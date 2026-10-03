# Equipment passport and guided setup

Apply this patch after the monitoring-usability update. Stop the backend, apply the patch, then run `npx prisma migrate deploy` and `npx prisma generate` from `backend/`. Restart both applications.

Equipment setup has three steps:
1. Machine & passport: identity, site, PLC connection and optional manufacturer, model, serial number, specification reference, rated power (kW), rated current (A), maximum permitted temperature (°C). Leave unknown or inapplicable fields blank.
2. Connect measurements: browse/add PLC tags, select metric cards, assign meanings, labels and display units. Read PLC values shows the last manually read value and timestamp beside each tag. It is a snapshot, not an automatic continuous preview.
3. Review & monitoring: check mapped measurements and passport, then configure or review alarm and repair-check conditions. Save is available in this step. Navigation preserves unsaved edits within the editor.

Passport ratings are reference data only: they do not enable monitoring, create alarms, or override limits. Changing display units does not convert raw values. Existing equipment receives an empty passport; omitted passport data in API updates is preserved. Explicit empty objects clear passport fields. Company access checks, transactional writes and the existing open-maintenance-task configuration lock apply.

The equipment detail page shows the stored passport. Existing edit-card links open step 2. This update does not provide automatic manufacturer lookup, document upload, AI diagnosis, or PLC writes.

Validation: frontend and backend builds; passport validation and transactional save/preserve tests; existing alarm, monitoring and integration tests. Database migration and real PLC/UI acceptance still require the deployment environment.

## Assisted repair-check setup

The monitoring editor offers explicit suggestions from metric meanings (unique running/speed and load/current mappings). Suggestions are not PLC type detection and are applied only when the user clicks Use suggested signals. Existing thresholds are preserved and shown with selected display units for review. All tags remain available for unusual equipment.

Check selected signals with PLC uses the editor's manual preview read. Sampled incompatible values (such as 80 in ON/OFF mode or true for numeric load) block saving in this editor and display corrective text. Zero speed/load is a valid reading and does not block configuration. Missing/bad readings remain unverified; offline setup is allowed. Numeric 0/1 remains accepted for boolean feedback, matching the backend engine. This is sample validation, not proof of the full PLC datatype or operating range. Server monitoring still reports incompatible readings as unknown.
