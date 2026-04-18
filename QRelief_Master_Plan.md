# QRelief - Master Build Plan

> Android-first disaster-relief distribution app · 3 roles · 7 phases · 7 build slices

---

## Overview

| | |
|---|---|
| **Stack** | React Native · Expo · TypeScript · Expo Router · Supabase |
| **Roles** | `beneficiary` · `staff` · `admin` |
| **Primary flow** | Signup -> Approval -> QR issued -> Staff scans -> Distribution logged -> Inventory decremented |
| **Key constraint** | Must work in low/no connectivity field conditions |

---

## Critical Path

```text
Phase 1 (Auth)
    ↓
Phase 2 (Approval + QR)   <- unblocks everything
    ↓
Phase 3 (Events + Inventory + Staff)
    ↓
Phase 4 (Scan + Distribute)   <- core operational flow
    ↓
Phase 5 (Beneficiary UX) ------+
Phase 6 (Dashboard + Reports) -|  can run in parallel
    ↓                          |
Phase 7 (Offline + Polish) <---+
```

---

## Phase 1 - Auth + User Foundation

**Slice:** Slice 1  
**Estimate:** 2-3 days  
**Milestone:** Users can sign up, log in, and land on role-specific screens

### Supabase Setup

- [x] Init Expo project + Expo Router - managed workflow, TypeScript, folder structure
- [x] Supabase project + env config - dev/staging/prod environments, typed client
- [x] Database schema: `profiles` + roles - profiles table, role enum, RLS policies, auto profile trigger

### Auth Screens

- [x] Sign in screen - email/password, Supabase Auth, error handling
- [x] Sign up screen - role-aware registration form
- [x] Password reset flow - Supabase magic link + reset screen
- [x] Session persistence - secure storage for token, auto-refresh

### Role Routing

- [x] Protected route guards - role-aware navigation, redirect to correct tab group
- [x] Beneficiary signup form - full name, contact, address, household size, gov ID
- [x] Pending approval screen - beneficiary sees status if not yet approved

---

## Phase 2 - Admin: Beneficiary Approval

**Slice:** Slice 2  
**Estimate:** 2-3 days  
**Milestone:** Admin can approve a beneficiary -> QR token generated -> beneficiary unblocked  
**Depends on:** Phase 1 complete. This slice unblocks the entire operational flow.

### Beneficiary Management

- [x] Beneficiary list screen - searchable, filterable by status (pending/approved/rejected)
- [x] Beneficiary detail screen - view all submitted fields, notes, internal flags
- [x] Approve action + QR generation - DB trigger generates unique `qr_token` on approval
- [x] Reject action with reason - rejection reason stored, shown to beneficiary

### Database

- [x] `beneficiaries` table + RLS - status enum, `qr_token`, household data, RLS per role
- [x] QR token generation trigger - server-side UUID on approval, never client-generated

---

## Phase 3 - Events + Inventory + Staff Assignment

**Slice:** Slice 3  
**Estimate:** 3-4 days  
**Milestone:** Admin can create an event, stock it, and assign staff to it  
**Depends on:** Phase 1. Phase 2 should be complete for full testing.

### Events CRUD

- [x] Events list + event form - create, edit, cancel, archive; status management
- [x] Event item allocations - assign inventory items + per-beneficiary quantities to event
- [x] Staff assignment to events - assign/remove staff; RLS restricts staff to assigned events

### Inventory Management

- [x] Inventory item list + CRUD - create/edit/delete items, unit of measure, category
- [x] Stock in/out adjustments - adjustment form, movement log, audit trail
- [x] Low-stock threshold + alerts - per-item threshold, warning badge, dashboard alert

### Staff Management

- [x] Staff list + invite flow - create staff accounts, activate/deactivate
- [x] `staff_assignments` table + RLS - many-to-many, RLS enforces event access scope

### Database

- [x] `events`, `inventory_items`, `event_items` tables - schema, migrations, RLS
- [x] `inventory_movements` table - tracks every stock change with reason + actor

---

## Phase 4 - Staff: Scan + Distribute Critical Path

**Slice:** Slice 4  
**Estimate:** 3-5 days  
**Milestone:** Staff scans QR -> system verifies -> distribution logged -> inventory decremented  
**Depends on:** Phases 1, 2, 3. This is the core operational flow.

### QR Scanner

- [x] Camera-based QR scan screen - Expo-compatible library, permissions flow, torch support
- [x] Scan feedback: haptics + sound - success/error haptics, optional audio on successful distribution
- [x] Invalid QR + fallback manual lookup - handle bad tokens, type-in search fallback

### Verification Flow

- [x] Beneficiary lookup by QR token - fetch profile, approval status, current event eligibility
- [x] Duplicate claim prevention - check `distributions` table; one claim per beneficiary per event
- [x] Allocation display - show assigned items + quantities for selected event

### Distribution Logging

- [x] Confirm distribution action - item selection/confirmation, optional notes, quantity adjustments
- [x] `distributions` table write + RLS - insert distribution record, enforced server-side duplicate check
- [x] Inventory decrement RPC - server-side function: decrement `event_items` stock + log movement

### Staff UX

- [x] Assigned events list - staff sees only their assigned events, status filter
- [x] Recent distributions list - timestamp, beneficiary name, items given, sync state

---

## Phase 5 - Beneficiary Experience

**Slice:** Slice 6  
**Estimate:** 2-3 days  
**Milestone:** Beneficiary can browse events, view their QR, and see claim history  
**Depends on:** Phase 2 (approval + QR). Phase 3 needed for events.

### Beneficiary Screens

- [x] Home dashboard - approval status card, quick actions
- [x] Upcoming/active events list - browse events with allocation preview
- [x] My QR code screen - full-screen QR display, brightness boost, share option
- [x] Claim history - past distributions with items received and dates
- [x] Profile screen - view/edit personal info, submitted documents

---

## Phase 6 - Admin Dashboard + Reports

**Slice:** Slice 5  
**Estimate:** 2-3 days  
**Milestone:** Admin has full operational visibility and basic reporting  
**Depends on:** Phases 2, 3, 4 for meaningful data.

### Admin Dashboard

- [x] KPI cards - pending approvals, active events, low-stock count, total distributions
- [x] Recent activity feed - audit log of key actions (approvals, distributions, stock changes)
- [x] Quick actions - approve pending, create event, adjust stock

### Reports

- [x] Event summary report - per-event: total distributed, items given, beneficiaries served
- [x] Inventory report - current stock, movements log, low-stock list
- [x] Staff activity report - distributions per staff member, per event
- [x] Distribution trends - time-series chart of distributions, basic export

---

## Phase 7 - Offline Field Operations + Polish

**Slice:** Slice 7  
**Estimate:** 3-5 days  
**Milestone:** App is fully field-ready: offline queue, sync, validation, production config  
**Depends on:** All previous phases. Final hardening pass.

### Offline Queue

- [x] SQLite / Expo local persistence - cache assigned events and recent beneficiary lookups
- [x] Offline distribution queue - enqueue distribution actions when offline
- [x] Sync on reconnect - retry logic, conflict detection, server-wins strategy
- [x] Duplicate mitigation (offline) - local dedup check before queueing, server dedup on sync
- [x] Network status UI - online / offline / syncing / sync-failed states clearly shown

### Polish + Production Readiness

- [x] Skeleton loaders + empty states - all async screens have loading and empty states
- [x] Toast / snackbar feedback - success/error feedback for all key actions
- [x] Form validation (Zod) - schema-driven validation on all forms
- [x] Crash-safe async handling - error boundaries, graceful fallbacks
- [ ] App icon, splash, env config - icons, splash screen, dev/staging/prod env vars
- [x] Accessibility pass - tap targets >= 44px, contrast, screen reader labels
- [x] Testing strategy coverage - auth flow, RLS, QR scan, duplicate prevention, offline sync

---

## Database Schema Summary

| Table | Purpose |
|---|---|
| `profiles` | One per user. Links auth UID to role. |
| `beneficiaries` | Beneficiary-specific data, status, `qr_token` |
| `staff` | Staff records, active status |
| `events` | Events with status lifecycle |
| `inventory_items` | Item catalogue with stock levels and thresholds |
| `event_items` | Per-event item allocations + quantities |
| `staff_assignments` | Staff <-> event many-to-many |
| `distributions` | Every completed distribution record |
| `inventory_movements` | Full audit log of every stock change |

### Server-Side Guarantees

- Auto profile creation on signup (trigger)
- QR token generation on approval (trigger/RPC)
- Duplicate claim prevention (unique constraint + RPC)
- Inventory decrement on distribution (RPC)
- Inventory movement logging (trigger on `distributions`)
- RLS on all user-facing tables

---

## Project Structure

```text
app/
  (auth)/
  (beneficiary)/
  (staff)/
  (admin)/
  modal/

src/
  components/
  features/
    auth/
    beneficiary/
    staff/
    admin/
    inventory/
    events/
    distribution/
  lib/
    supabase/
    storage/
    sync/
    utils/
  hooks/
  providers/
  types/
  constants/
```

---

## Screen Map

### Shared
- Splash / loading
- Sign in · Sign up · Forgot password
- Profile · Notifications

### Beneficiary
- Home dashboard
- Upcoming events · Event details
- My QR code
- Claim history · Profile/status

### Staff
- Assigned events
- Scanner · Manual lookup
- Verification · Item confirmation
- Recent distributions

### Admin
- Dashboard
- Beneficiaries · Beneficiary detail
- Events · Event form · Event allocations
- Staff management
- Inventory · Stock adjustment
- Reports

---

## Testing Checklist

- [ ] Auth flow + role routing
- [ ] RLS enforcement per role
- [ ] Beneficiary approval flow end-to-end
- [ ] QR scan + manual lookup
- [ ] Duplicate claim rejection (online + offline)
- [ ] Distribution logging + inventory decrement
- [ ] Offline queue creation and sync
- [ ] Low-stock threshold triggering

---

## Definition of Done

The app is complete when:

1. A beneficiary can sign up and wait for approval
2. An admin can approve that beneficiary and generate a QR token
3. A staff member can scan the QR at an assigned event
4. The system prevents duplicate claims at the server level
5. The distribution is logged in Supabase
6. Inventory is decremented correctly via RPC
7. The app remains usable in weak or intermittent connectivity
8. All three roles have coherent, tested mobile flows
