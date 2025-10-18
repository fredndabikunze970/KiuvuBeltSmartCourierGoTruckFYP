# Level 1 DFD — KIVU Belt Smart Courier Go Truck

This Level 1 DFD decomposes the main system into primary processes and shows data flows between those processes and data stores.

```mermaid
flowchart TB
  %% Processes
  subgraph SYS[KIVU Belt Smart Courier System]
    P1[1.0 Package Registration & Payments]
    P2[2.0 Package Assignment & Routing]
    P3[3.0 Tracking & Monitoring]
    P4[4.0 Notifications & Alerts]
    P5[5.0 Reporting & Admin]
  end

  %% External actors
  CU[Customer<br/>Sender / Receiver]
  AG[Agent]
  ADM[Admin]
  SMSP[SMS Provider / Twilio]
  LOCATIONIQ[LocationIQ]

  %% Data stores
  DB[(Postgres DB)]
  FB[(Firebase Realtime DB)]

  %% Flows: Customers & Agents interact
  CU -->|Submit package + payment info| P1
  AG -->|Register package & confirm cash payments| P1

  %% P1 writes to DB
  P1 -->|package, payment records| DB
  P1 -->|enqueue notification| P4

  %% Assignment & routing
  P2 -->|update assignment| DB
  P2 -->|vehicle location write| FB
  AG -->|assign vehicle, set driver| P2
  P1 -->|new package triggers routing| P2

  %% Tracking
  FB -->|live GPS updates| P3
  P3 -->|compute progress| DB
  P3 -->|if off-route| P4
  P3 -->|if arrived (100%)| P4 & DB

  %% Notifications
  P4 -->|SMS / Notification records| SMSP
  P4 -->|notification DB records| DB

  %% Reporting
  ADM -->|request reports| P5
  P5 -->|read payments/packages/tracking| DB
  P5 -->|generate Export (PDF/CSV)| ADM

  %% External services
  P2 -->|route geometry| LOCATIONIQ
  P3 -->|route geometry| LOCATIONIQ

  style P1 fill:#eff6ff,stroke:#1e40af
  style P2 fill:#fff7ed,stroke:#ea580c
  style P3 fill:#f0fdf4,stroke:#16a34a
  style P4 fill:#fffbeb,stroke:#f59e0b
  style P5 fill:#f8fafc,stroke:#0ea5e9
```

Process descriptions:
- 1.0 Package Registration & Payments
  - Handles creation of package records, capturing sender/receiver details, delivery fees, and payment entries.
  - Records payments (pending/confirmed) and allows agents to confirm cash payments.
  - Writes both package and payment rows to Postgres.

- 2.0 Package Assignment & Routing
  - Assigns cars/drivers to packages and computes route geometry via LocationIQ for routing and estimated travel.
  - Writes vehicle assignment to packages and stores planned route geometry in DB (or uses it ad-hoc for monitoring).
  - Writes live vehicle location to Firebase when vehicles push updates.

- 3.0 Tracking & Monitoring
  - Consumes live GPS updates (from Firebase or direct POST) and computes progress percent using haversine/route geometry.
  - Inserts tracking records into `tracking` table and normalizes progress on arrival.
  - Triggers Off-route alerts when distance from planned polyline exceeds threshold.

- 4.0 Notifications & Alerts
  - Creates notification records in DB and/or sends SMS via Twilio.
  - Sends arrival SMS only when tracking progress reaches 100%.
  - Sends off-route alerts immediately when deviation is detected.

- 5.0 Reporting & Admin
  - Admin can query payments, packages, and generate exports (PDF/CSV).
  - Dashboard provides filters (date ranges, status) and summary statistics.

Data stores:
- Postgres: packages, users, branches, payments, tracking, notifications.
- Firebase Realtime DB: vehicle live positions (used for real-time monitoring and map display).

Notes & assumptions
- Realtime location data may be ingested via Firebase or direct API post (both flows present in the repository).
- Notifications may be recorded as DB rows for auditing and also forwarded to Twilio for delivery; error handling for SMS is best-effort.
- Some processes (e.g., auto-transition jobs) may be implemented as background jobs or in-process timers — in production they'd be moved to cron or worker services.

---

For diagrams in other formats or to include PNG/SVG outputs, I can generate downloadable images from the Mermaid source or produce Visio/Draw.io files. Would you like the diagrams exported as images and added to the repository?