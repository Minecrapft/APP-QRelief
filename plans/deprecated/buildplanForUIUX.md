# AI Design Prompt: QRelief Tactical UI/UX

## Role & Context
You are a Lead UI/UX Designer specializing in high-stakes, mission-critical applications. The project is **QRelief**, an Android-first disaster-relief distribution platform designed for three distinct roles: **Beneficiaries**, **Field Staff**, and **Admins**. The app must function reliably in low-connectivity, high-stress environments.

## Visual North Star: "Signal Tactical"
Create a UI that feels like a piece of high-end field equipment: rugged, precise, and hyper-legible.

*   **Color Palette:** Use a primary "Tactical Blue" (#0052CC) against high-contrast backgrounds (off-white #F3FAFF for light mode). Use "Action Orange" for critical registrations and "Operational Blue" for primary buttons. Status colors should be definitive: Red (Critical/Urgent), Blue (Operational/Active), Gray (Planned/Archived).
*   **Typography:** Use **Public Sans** for headlines to convey authority and stability. Use **Inter** for UI labels and data points for maximum clarity at small sizes.
*   **UI Components:**
    *   **Cards:** Use subtle borders and "docked" accents (colored vertical bars on the left) to indicate status or category.
    *   **Interaction:** Large tap targets (min 44px). Buttons should have sharp or slightly rounded corners (4px) to feel "engineered."
    *   **Data Density:** Information should be dense but organized with clear hierarchy. Use monospaced numbers for IDs and quantities to ensure character alignment.

## Core User Flows to Generate

### 1. The Beneficiary Experience (Lightweight & Clear)
*   **Sign-In/Registration:** High-contrast forms with clear field labels. Include a prominent "Register for Aid" CTA.
*   **Dashboard:** A status-first view. If approved, show a "Show My QR Code" button immediately. Use status banners for "Approved," "Pending," or "Action Required."
*   **Tactical QR Screen:** A full-screen, high-contrast QR code centered on a clean card. Include a "Brightness Boost" tip for outdoor scanning.

### 2. Staff Operations (Fast & Durable)
*   **Assigned Events:** A list of active missions. Each card shows queue size, stock levels, and a direct "Open Scanner" shortcut.
*   **Verification Interface:** After scanning, show a split view: the beneficiary's ID photo and household context (family size, priority level) on top, and their specific "Allocated Items" list with checkboxes below.
*   **Confirmation:** A final verification step with large "Complete Distribution" button and haptic-ready feedback UI.

### 3. Admin Command (Insight & Control)
*   **Operations Dashboard:** Real-time KPI cards (Pending Approvals, Low Stock Alerts, Total Distributions). Include a live activity feed of field logs.
*   **Inventory Command:** A detailed list of medical, food, and water supplies. Use progress bars to show stock levels relative to critical thresholds. Include "Reorder" triggers for low-stock items.

## Key Technical Details for AI
*   **Device:** Mobile (Android focus).
*   **Layout:** Bottom navigation bar for primary roles. Top app bar with role-specific leading icons (e.g., Grid View for Admin, Back for Staff flows).
*   **Icons:** Use Material Symbols (outlined) for a clean, professional look.
*   **States:** Always design for "Live Field Sync" indicators and "Offline Queue" badges to reflect connectivity status.