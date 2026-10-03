# Company team and two-account demonstration

Apply after the monitoring-guidance patch. Restart frontend and backend. No database migration is required.

Owners and administrators can open Dashboard → Team. Owners can create ADMIN, TECHNICIAN and VIEWER accounts in their own company. Administrators can create TECHNICIAN and VIEWER accounts. Company identity comes from the authenticated user, never from the submitted form. Responses contain no password hash. Existing email accounts cannot be moved between companies through this form.

Use the existing owner account as management and create an engineer with TECHNICIAN. The administrator sets an initial password (12 characters minimum, 72 UTF-8 bytes maximum). No email is sent. This first version does not include invitations, password reset, forced password change, account disabling or role editing.

For the demo, keep the owner signed in in the regular browser and sign the engineer into an incognito window or separate browser profile. Ordinary tabs share the session cookie and do not represent two separate users. Use the lowercase email shown on the Team page when signing in.

Trigger a simulated confirmed alarm. Existing monitoring sends initial notifications to company owners, administrators and technicians. The engineer accepts the task from Maintenance and submits a repair report. Management sees acceptance and verification-result notifications. A failed verification means measurements did not confirm recovery; it does not prove dishonesty. Current audit messages may identify the actor by email.

Accounts share all company equipment according to existing role permissions. This update does not add department hierarchy, per-equipment responsibility assignments, scheduled escalation or external email/SMS delivery. Existing technician roles can edit equipment configuration as well as handle maintenance.

Validation: frontend/backend builds and 11 service tests for company scoping, authorization, allowed roles, duplicate accounts and password handling. Real database and browser acceptance remain deployment checks.
