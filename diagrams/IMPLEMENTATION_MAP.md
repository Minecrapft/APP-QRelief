# QRelief: Flowchart & Implementation Map

This document explains the logic behind each system flowchart and maps the diagrams to their actual locations in the codebase.

---

### [2a] Onboarding & Verification (The Trust Gate)
*   **Logic**: Handles user signup, administrative review, and the secure generation of a QR identity.
*   **Frontend**: 
    *   `src/features/auth/`: Multi-role registration forms.
    *   `app/(admin)/beneficiaries/`: Admin approval/rejection interface.
*   **Backend**: 
    *   Supabase `profiles` & `beneficiaries` tables.
    *   Database trigger/RPC for `qr_token` generation upon approval.

### [2b] Mission Planning (Resource Allocation)
*   **Logic**: Defines the "What" and "Where" of a relief operation by stocking items and scheduling events.
*   **Frontend**: 
    *   `app/(admin)/inventory/`: Catalog management and stock adjustments.
    *   `app/(admin)/events/`: Event creation and item/staff allocation.
*   **Backend**: 
    *   Supabase tables: `inventory_items`, `events`, `event_items`, `staff_assignments`.

### [2c] Field Logistics (The Operational Core)
*   **Logic**: The real-time distribution flow including QR scanning, eligibility verification, and offline synchronization.
*   **Frontend**: 
    *   `app/(staff)/scanner/`: QR camera integration and verification UI.
    *   `src/lib/sync/` & `src/lib/storage/`: Offline queue using Expo SQLite.
*   **Backend**: 
    *   `distributions` table & `inventory_movements` log.
    *   Supabase RPCs for transaction-safe inventory decrementing.

### [2d] Command Center (Operational Intelligence)
*   **Logic**: Data-driven oversight using turnout forecasting and real-time KPI monitoring.
*   **Frontend**: 
    *   `app/(admin)/dashboard/`: KPI cards and activity feed.
    *   `app/(admin)/events/[id]`: Turnout prediction card with confidence metrics.
*   **Backend**: 
    *   Open-Meteo API integration for weather signals.
    *   Prediction logic defined in `buildplanForTurnoutPrediction.md`.
    *   Supabase RPCs for reporting and forecasting data.
