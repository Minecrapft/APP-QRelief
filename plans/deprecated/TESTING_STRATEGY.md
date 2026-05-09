# QRelief Testing Strategy

## Core Flows

1. Auth flow and role routing
   Verify sign-in, sign-up, password reset, session restore, and role-based redirects.
2. Beneficiary approval flow
   Verify pending beneficiaries can be approved or rejected and that approval creates a QR token.
3. Staff scan and distribution flow
   Verify QR scan/manual lookup, eligibility checks, duplicate prevention, and successful distribution logging.
4. Inventory and event operations
   Verify stock adjustments, event allocations, staff assignments, and low-stock alerts.
5. Offline queue and reconnect sync
   Verify cached assigned events/lookups, offline distribution queueing, reconnect sync, and conflict handling.

## Role-Based Coverage

- `beneficiary`
  Confirm pending status, QR visibility, active event list, claim history, and profile updates.
- `staff`
  Confirm assigned events, scanner access, offline queue state, reconnect sync, and recent distribution history.
- `admin`
  Confirm beneficiary review, events, inventory, staff activation, dashboard KPIs, and reports.

## Database and Security Checks

- Confirm RLS behavior for all three roles against `profiles`, `beneficiaries`, `staff`, `events`, `event_items`, `staff_assignments`, `distributions`, and `inventory_movements`.
- Confirm duplicate claim prevention works both online and after offline sync.
- Confirm inventory movement rows and stock changes are created for every successful distribution.

## Regression Checklist

- Run `npm run typecheck`
- Launch the app with `npm start`
- Re-test one admin, one staff, and one beneficiary path after any schema or provider changes
- Re-test offline queue behavior whenever the staff distribution flow changes
