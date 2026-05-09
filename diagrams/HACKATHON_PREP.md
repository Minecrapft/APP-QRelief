# QRelief: Hackathon Presentation & Demo Kit

This kit is designed to help you frame the system, nail the demo, and answer tough technical questions during your hackathon presentation.

---

## 1. The 30-Second "Elevator Pitch"
> "Disaster relief is often a race against chaos. When the internet goes down and supplies are limited, traditional paper systems lead to fraud and missing data. **QRelief** is a tactical, offline-first platform that ensures the right aid reaches the right people. We combine a secure QR-based workflow with data-driven turnout prediction to make sure relief operations are precise, transparent, and resilient in the toughest field conditions."

---

## 2. The Demo Script (3-5 Minutes)

### **Act 1: The Command Center (Admin View)**
*   **Action**: Open the Admin Dashboard.
*   **Script**: *"We start at the Command Center. As an Admin, I can see real-time KPIs: how many beneficiaries are waiting for approval and where our stock is critically low. Look at this—our Turnout Prediction Engine is warning us that for tomorrow's event, we’re likely to see a 20% increase in attendance due to local weather signals. We can adjust our staging now, before the crowd arrives."*

### **Act 2: The Trust Gate (Beneficiary View)**
*   **Action**: Show a Beneficiary QR code (or the signup flow).
*   **Script**: *"For a victim of a disaster, access must be simple. A beneficiary signs up once, gets verified by the team, and receives a unique, secure QR identity. This isn't just a number—it’s their digital key to aid that works even when they are offline."*

### **Act 3: The Front Line (Staff View + The 'Wow' Moment)**
*   **Action**: Open the Scanner. **Crucial**: Turn on Airplane Mode.
*   **Script**: *"This is the real world. In a disaster, the towers are down. I’m now in Airplane Mode—zero connectivity. I scan the beneficiary's QR code. The app instantly verifies their allocation from our local SQLite cache. I confirm the distribution, and the transaction is queued. The moment I get even a sliver of signal, QRelief syncs that data back to the global audit log, preventing double-claims across the entire region."*

---

## 4. The "Technical Flex" (Judge's Questions)
When asked "How did you build this?", focus on these three pillars:

1.  **Offline-First Resilience**: 
    *   *"We used a local-first persistence layer with Expo SQLite. We don't just 'hope' for sync; we built a robust queueing system that handles conflict resolution once the network is restored."*
2.  **Server-Side Integrity**: 
    *   *"All critical operations—like inventory decrements and QR generation—happen via Supabase RPCs and database triggers. This ensures the database remains the single source of truth, even if the client is compromised."*
3.  **Predictive Staging**: 
    *   *"We integrated the Open-Meteo API to fetch real-time weather signals. We use these as weights in our turnout prediction formula to help admins move from reactive to proactive relief."*

---

## 5. Potential Q&A Prep

| **Question** | **Your Best Answer** |
| :--- | :--- |
| **"How do you prevent someone from using a screenshot of a QR code?"** | *"The QR tokens are tied to a unique profile and the system logs every scan instantly. If a duplicate token is scanned, the local cache or server sync will flag it as 'Already Claimed' immediately."* |
| **"What happens if the phone running the scanner runs out of battery?"** | *"The system is decentralized. Any staff member with the app can pick up exactly where the last one left off because the event state is synced across all authorized staff devices."* |
| **"How scalable is the turnout prediction?"** | *"Right now, it uses historical QRelief data and weather APIs. Because we built it as a modular RPC in Supabase, we can easily plug in more advanced ML models or GIS data as the project grows."* |

---

## 6. Pro-Tips for the Big Day
*   **The Airplane Mode Move**: Actually switching to Airplane Mode during the live demo is the strongest way to prove your app's value proposition.
*   **Have Pre-Loaded Data**: Don't waste time typing. Have a pre-approved beneficiary and a stocked event ready to go.
*   **Focus on Impact**: Always tie a technical feature back to a human benefit (e.g., *"This sync logic means a mother doesn't have to wait in line twice because of a data error."*)
