# QRelief Build Plan - Event Turnout Prediction

> Forecast expected attendance for relief events using QRelief history, weather signals, and location context.

---

## Goal

Build an admin-facing turnout prediction feature that helps QRelief estimate how many approved beneficiaries are likely to appear at a scheduled event so admins can pre-stage the right amount of aid, staff, and inventory.

This plan is meant to be the working reference during implementation, similar to the main master plan.

---

## Product Outcome

When an admin creates or reviews an event, QRelief should be able to show:

- predicted turnout count
- confidence level
- key drivers behind the estimate
- recommended inventory preparation buffer
- fallback behavior when data is limited

---

## Design Principles

- Start with explainable prediction, not black-box AI.
- Prefer QRelief operational data first, then enrich with free external data.
- Keep the first release cheap, deterministic, and easy to debug.
- Make every prediction auditable so admins understand why the number was produced.
- Add AI-generated narrative only after the baseline prediction pipeline is stable.

---

## Data Sources

### Internal QRelief Data

- past events
- event status and schedule
- total approved beneficiaries
- event distributions
- duplicate/no-show behavior inferred from allocations vs actual claims
- location text and later lat/lng when available
- household priority flags where relevant

### Free External Data

- weather forecast from Open-Meteo
- geocoded distance/proximity signals based on event location and beneficiary/event area context

### Optional AI/ML Layer

- simple regression or scoring model stored server-side
- optional free-tier inference later for explanation text only

---

## Phase 1 - Data Foundation

**Goal:** Make sure the app has the structured data required for prediction.

### Scope

- [ ] Audit existing tables needed for prediction inputs
- [ ] Identify turnout ground-truth logic from `distributions`
- [ ] Define derived metrics:
  - attendance rate
  - no-show rate
  - event-type baseline
  - day/time attendance pattern
- [ ] Add missing fields if required for prediction snapshots
- [ ] Document prediction inputs and output contract

### Deliverable

A stable data contract for turnout forecasting.

---

## Phase 2 - Prediction Engine V1

**Goal:** Ship a deterministic first forecast without depending on paid AI.

### Scope

- [ ] Build server-side prediction formula or SQL/RPC
- [ ] Use:
  - approved beneficiary pool
  - historical attendance
  - event timing
  - active allocation context
- [ ] Return:
  - predicted_turnout
  - confidence
  - explanation_factors
  - recommended_buffer
- [ ] Handle low-data scenarios gracefully

### Deliverable

A working V1 turnout prediction engine based on QRelief data only.

---

## Phase 3 - Weather Enrichment

**Goal:** Improve the forecast using free weather data.

### Scope

- [ ] Integrate Open-Meteo forecast lookup
- [ ] Map weather conditions into turnout adjustment factors
- [ ] Add rain/heat/severe-weather impact scoring
- [ ] Cache weather responses for prediction windows
- [ ] Add error fallback if weather service is unavailable

### Deliverable

Prediction engine includes weather-aware turnout adjustment.

---

## Phase 4 - Location & Proximity Signals

**Goal:** Improve prediction quality using event location context.

### Scope

- [ ] Normalize event location inputs for prediction use
- [ ] Add geocoding strategy for event coordinates
- [ ] Add proximity or accessibility heuristic
- [ ] Use location confidence when exact beneficiary location data is limited
- [ ] Define safe fallback when only coarse location text exists

### Deliverable

Prediction engine includes location-sensitive turnout weighting.

---

## Phase 5 - Admin UI

**Goal:** Surface predictions clearly in the app.

### Scope

- [ ] Add turnout prediction card to admin event flow
- [ ] Show:
  - predicted turnout
  - confidence badge
  - recommended prep quantity
  - explanation bullets
- [ ] Add empty states for low-data/no-forecast conditions
- [ ] Match the Signal Tactical UI language
- [ ] Ensure mobile readability and scanability

### Deliverable

Admins can view and understand turnout prediction directly in the event workflow.

---

## Phase 6 - Refresh, Caching, and Reliability

**Goal:** Make prediction usable in real operations.

### Scope

- [ ] Add refresh action for updated prediction
- [ ] Cache recent forecasts
- [ ] Avoid repeated external API calls
- [ ] Add loading/error states
- [ ] Add timestamps like `forecast generated at`

### Deliverable

A reliable, operationally safe forecasting workflow.

---

## Phase 7 - AI Explanation Layer

**Goal:** Add optional narrative explanation if useful.

### Scope

- [ ] Generate short explanation text from the structured prediction output
- [ ] Keep explanation grounded in numeric factors
- [ ] Never let generative text replace the deterministic forecast
- [ ] Add clear fallback when AI explanation is unavailable

### Deliverable

Human-readable prediction commentary layered on top of the structured model.

---

## Phase 8 - Validation & Tuning

**Goal:** Compare predictions against real outcomes and improve quality.

### Scope

- [ ] Store prediction snapshots for events
- [ ] Compare predicted turnout vs actual turnout
- [ ] Measure absolute error and bias
- [ ] Tune forecast weights
- [ ] Add admin trust notes when prediction quality is still maturing

### Deliverable

A feedback loop for improving turnout prediction over time.

---

## Suggested Build Order

1. Phase 1 - Data Foundation
2. Phase 2 - Prediction Engine V1
3. Phase 5 - Admin UI
4. Phase 6 - Refresh, Caching, and Reliability
5. Phase 3 - Weather Enrichment
6. Phase 4 - Location & Proximity Signals
7. Phase 7 - AI Explanation Layer
8. Phase 8 - Validation & Tuning

---

## Definition of Done

The turnout prediction feature is complete when:

1. An admin can open an event and see a turnout forecast.
2. The forecast is generated from QRelief operational data.
3. Weather can improve the forecast when available.
4. The UI explains the main factors behind the estimate.
5. The system behaves safely when data is missing.
6. Forecasts can be compared against actual turnout later.

