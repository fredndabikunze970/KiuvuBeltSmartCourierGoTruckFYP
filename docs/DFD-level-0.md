# Level 0 DFD — KIVU Belt Smart Courier Go Truck

This document describes a Level 0 (context) Data Flow Diagram for the KIVU Belt Smart Courier Go Truck project. It shows the system as a single process and its interactions with external actors and data stores.

```mermaid
flowchart TB
  subgraph ExternalActors
  CU[Customer<br/>Sender / Receiver]
    AG[Agent]
    ADM[Admin]
    SMSP[SMS Provider / Twilio]
    LOCATIONIQ[LocationIQ]
  end

  subgraph System[KIVU Belt Smart Courier System]
    SYS[Package Management & Tracking]
  end

  CU -->|Create package, Track package| SYS
  AG -->|Register package, Update status, Confirm payments| SYS
  ADM -->|Manage packages, View reports| SYS
  SYS -->|Send SMS notifications| SMSP
  SYS -->|Route & geometry requests| LOCATIONIQ
  SYS -->|Store & Retrieve| DB[(Postgres DB)]
  SYS -->|Realtime location updates| FIREBASE[(Firebase Realtime DB)]

  style SYS fill:#f3f4f6,stroke:#6366f1
  style DB fill:#ecfccb,stroke:#65a30d
  style FIREBASE fill:#cffafe,stroke:#0891b2
```

Summary:
- External actors: Customers (senders/receivers), Agents (register packages, confirm payments, update statuses), Admin (reports and management), SMS provider (Twilio), Location service (LocationIQ).
- Main system: accepts package registrations, manages payments, tracks GPS updates, sends notifications, and stores data in Postgres + Firebase for realtime.

Key data stores:
- Postgres (packages, payments, users, tracking, branches, notifications)
- Firebase Realtime DB (vehicle live positions)

This Level 0 DFD intentionally simplifies internal processes to a single system box that communicates with external actors and data stores.
