# QRelief System Flowcharts

### 1. High-Level System Overview (The Inter-Module Map)
This diagram shows the "Big Picture" of how data flows between the major components of QRelief.

```mermaid
graph TD
    %% Component Nodes
    A[<b>1. Onboarding & Verification</b><br/>Beneficiary Registration]
    B[<b>2. Mission Planning</b><br/>Inventory & Event Setup]
    C[<b>3. Field Logistics</b><br/>QR Scanning & Distribution]
    D[<b>4. Command Center</b><br/>Analytics & Prediction]

    %% Data Flows
    A -->|Verified Profiles| D
    A -->|QR Tokens| C
    
    B -->|Event & Stock Data| C
    B -->|Inventory Thresholds| D
    
    C -->|Real-time Logs| D
    
    D -->|Turnout Forecasts| B
    D -->|Low Stock Alerts| B

    style A fill:#f9f,stroke:#333,stroke-width:2px
    style B fill:#bbf,stroke:#333,stroke-width:2px
    style C fill:#bfb,stroke:#333,stroke-width:2px
    style D fill:#fbb,stroke:#333,stroke-width:2px
```

---

### 2. Detailed Module Flowcharts

#### A. Onboarding & Verification (The Trust Gate)
*Handles the lifecycle of a beneficiary from signup to QR generation.*
```mermaid
graph LR
    subgraph Beneficiary
        Start[Sign Up] --> Profile[Fill Profile & Docs]
        Profile --> Submit[Submit for Approval]
    end

    subgraph Admin_Review
        Submit --> Queue[Pending Approval Queue]
        Queue --> Review{Verify Data?}
        Review -->|Rejected| Reason[Notify with Reason]
        Review -->|Approved| Trigger[Auto-Generate QR Token]
    end

    Trigger --> Success[QR Code Visible in App]
    Reason --> Profile
```

#### B. Mission Planning (Resource Allocation)
*Handles inventory stocking and staff assignment.*
```mermaid
graph TD
    subgraph Inventory_Control
        Items[Define Items] --> Stock[Adjust Stock Levels]
        Stock --> Threshold[Set Low-Stock Alerts]
    end

    subgraph Event_Creation
        Items --> Allocate[Assign Items to Event]
        EV[Create Event Date/Loc] --> Allocate
        Allocate --> Staff[Assign Field Staff]
    end

    Staff --> Ready[Event Becomes Active for Staff]
```

#### C. Field Logistics (Distribution & Sync)
*The core "Scan-to-Log" workflow used by staff in the field.*
```mermaid
graph TD
    subgraph Staff_App
        Entry[Open Assigned Event] --> Scan[Scan Beneficiary QR]
        Scan --> Verify{Valid & Unclaimed?}
    end

    subgraph Verification_Logic
        Verify -->|No| Error[Show Error/Manual Search]
        Verify -->|Yes| Show[Show Allocated Items]
        Show --> Confirm[Confirm Handover]
    end

    subgraph Sync_Engine
        Confirm --> Net{Network?}
        Net -->|Offline| Local[(Save to SQLite Queue)]
        Net -->|Online| DB[Push to Supabase]
        Local -->|On Reconnect| DB
    end

    DB --> Update[Decrement Stock & Log Audit]
```

#### D. Command Center (Operational Intelligence)
*Data collection and turnout forecasting.*
```mermaid
graph TD
    subgraph Data_Inputs
        Hist[Historical Attendance]
        Pool[Approved Beneficiary Pool]
        Loc[Event Proximity Data]
        Ext[Open-Meteo Weather API]
    end

    subgraph Prediction_Engine
        Hist & Pool & Loc & Ext --> ML[Turnout Forecasting RPC]
        ML --> Forecast[Predicted Turnout & Confidence]
    end

    subgraph Dashboard
        Forecast --> KPIs[Admin KPI Cards]
        Audit[Distribution Logs] --> Report[Event Summary Reports]
    end
```

---

### Summary of Component Interactions
1.  **Onboarding** handles the "Who" (Security).
2.  **Mission Planning** handles the "What & Where" (Resources).
3.  **Field Logistics** handles the "How" (Execution).
4.  **Command Center** handles the "Why & When" (Strategy).