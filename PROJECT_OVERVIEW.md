# KIVU Belt Express Tracking System: Project Overview

## 1. System Architecture

The KIVU Belt Express system provides real-time package tracking through a professional web UI and a USSD service for basic mobile phones. It uses Firebase for real-time GPS updates and LocationIQ for advanced location services.

### 1.1. Frontend (Web UI)
*   Built using React/Next.js and TypeScript.
*   Offers a professional, mobile-responsive user interface.
*   Key components include a Live Map (Leaflet), Location History Cards, and a Progress Display.
*   Interacts with the backend API to fetch package data and real-time updates.
*   Environment variables used: `NEXT_PUBLIC_LOCATIONIQ_KEY`, `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_DATABASE_URL`, `NEXT_PUBLIC_API_URL`.

### 1.2. Backend (Next.js API Routes)
*   Manages API endpoints for tracking (`/api/tracking/{trackingNumber}`), USSD (`/api/ussd`), and other features like authentication, user management, and package registration.
*   Communicates with Firebase for real-time location data.
*   Integrates with LocationIQ for geocoding and routing.
*   Manages data persistence, likely using a relational database (suggested by the SQL migration scripts).
*   Core logic and utility functions are located in the `lib` directory (e.g., `api.ts`, `auth.ts`, `database.ts`, `firebase.ts`, `ussd.ts`).

### 1.3. Databases
*   **Firebase Realtime Database:** Primarily used for storing and fetching real-time GPS location updates every 3 seconds.
*   **Relational Database (e.g., PostgreSQL/NeonDB):** Indicated by SQL scripts, it likely stores static package details, user information, branch details, and historical tracking data.

### 1.4. External Services
*   **Firebase:** Provides real-time data synchronization for GPS tracking.
*   **LocationIQ API:**
    *   Calculates optimal driving routes.
    *   Performs reverse geocoding (converts coordinates to addresses).
    *   Calculates delivery progress and dynamic Estimated Time of Arrival (ETA).
*   **Africa's Talking (for USSD):** Serves as a gateway for USSD requests, forwarding them to the `/api/ussd` endpoint and relaying responses back to the user.

### 1.5. USSD Module
*   Accessible to users via a USSD code (e.g., `*123#`) on basic mobile phones.
*   Receives requests from Africa's Talking (or a similar telecom provider) at the `POST /api/ussd` endpoint.
*   Processes user input (e.g., tracking number).
*   Leverages the existing tracking infrastructure (package tracking API, LocationIQ, Firebase) to retrieve and process data.
*   Formats responses as plain text, starting with either `CON` (continue session) or `END` (end session).

## 2. System Flowchart
@startuml
title KIVU Belt Express Tracking System - Complete System Flowchart

skinparam monochrome true
skinparam shadowing false
skinparam activityBorderColor black
skinparam activityFontColor black
skinparam arrowColor black
skinparam activityDiamondFontColor black

start

:Web User Enters Tracking Number;
fork
  :Web Frontend requests package data;
  :Backend API fetches real-time GPS data from Firebase;
  :Backend API fetches tracking data from Relational DB;
  :Backend API calls LocationIQ for routing, geocoding, and progress calculation;
  :Backend API sends JSON response to Web Frontend;
  :Web Frontend displays Live Tracking UI;
fork again
  :Mobile User dials USSD Code;
  :Telecom Provider / Africa's Talking sends USSD request to Backend API (USSD Handler);
  :USSD Handler extracts Tracking Number;
  :USSD Handler calls internal tracking logic (via Backend API);
  :Backend API fetches real-time GPS data from Firebase;
  :Backend API fetches tracking data from Relational DB;
  :Backend API calls LocationIQ for geocoding and progress calculation;
  :USSD Handler formats USSD Text (CON/END);
  :Telecom Provider / Africa's Talking displays USSD Menu/Results to Mobile User;
end fork

stop

@enduml

## 3. Use Cases

This section outlines the primary use cases for the KIVU Belt Express Tracking System.

### 3.1. Web User Use Cases

#### UC1: Track a Package via Web Interface
*   **Description:** A customer or internal staff member wants to view the real-time status and location of a package using the web application.
*   **Actor(s):** Customer, Staff
*   **Preconditions:** The user has access to the web interface and a valid tracking number.
*   **Flow:**
    1.  User accesses the web tracking interface.
    2.  User inputs a valid package tracking number.
    3.  System displays package details, current GPS location on a map, location history, progress bar, and estimated arrival time.
    4.  The map and tracking details update in real-time (GPS every 3s, full data every 5s).
*   **Postconditions:** User has real-time visibility into package status.

#### UC2: Manage Dashboard Statistics
*   **Description:** An administrator or authorized staff member wants to view overall operational statistics, including package, payment, and fleet statuses.
*   **Actor(s):** Admin, Staff
*   **Preconditions:** User is logged in with appropriate permissions.
*   **Flow:**
    1.  User navigates to the dashboard section of the web application.
    2.  System displays key metrics such as total packages, delivered packages, active fleet, and total revenue.
    3.  Dashboard also shows detailed CAR001 history, other vehicle activities, and payment overviews.
    4.  Statistics update periodically and can be manually refreshed.
*   **Postconditions:** User has a high-level overview of system performance.

#### UC3: Real-time Fleet Monitoring
*   **Description:** An operations manager wants to monitor the live locations of all vehicles in the fleet on a map.
*   **Actor(s):** Operations Manager
*   **Preconditions:** User is logged in with appropriate permissions.
*   **Flow:**
    1.  User accesses the dashboard or a dedicated fleet monitoring interface.
    2.  System displays all active vehicles on a map with their current locations and movement.
    3.  Vehicle locations on the map update in real-time.
*   **Postconditions:** Manager has continuous oversight of fleet movements.

### 3.2. Mobile User (USSD) Use Cases

#### UC4: Track a Package via USSD
*   **Description:** A customer using a basic mobile phone wants to get the current status and location of their package without internet access.
*   **Actor(s):** Customer
*   **Preconditions:** User has a basic mobile phone and knows the USSD code and package tracking number.
*   **Flow:**
    1.  User dials the KIVU Belt Express USSD code (e.g., `*123#`).
    2.  System presents a welcome message and prompts for a tracking number.
    3.  User enters the package tracking number.
    4.  System processes the request using existing tracking infrastructure.
    5.  System sends a plain-text response containing package status, progress, current geocoded location, and sender/receiver info.
    6.  The USSD session typically ends after displaying the results.
*   **Postconditions:** User receives basic package tracking information on their mobile phone.

#### UC5: Check Basic Fleet Status (Future Enhancement)
*   **Description:** (Future) A driver or field agent wants to quickly check their current vehicle status or assignment via USSD.
*   **Actor(s):** Driver, Field Agent
*   **Preconditions:** User has a basic mobile phone and is authorized for fleet status checks.
*   **Flow:** (To be defined with future implementation)
*   **Postconditions:** (To be defined with future implementation)

## 4. Deployment Diagram

This diagram illustrates how the KIVU Belt Express Tracking System is deployed across various environments and interacts with external services.

@startuml
title KIVU Belt Express Tracking System - Deployment Diagram

skinparam monochrome true
skinparam shadowing false
skinparam cloudBorderColor black
skinparam cloudFontColor black
skinparam databaseBorderColor black
skinparam databaseFontColor black
skinparam componentBorderColor black
skinparam componentFontColor black

cloud "Cloud Environment" {
    artifact "Backend API Server" as BackendAPI
    database "Firebase Realtime DB" as FirebaseDB
    database "Relational Database\n(PostgreSQL/NeonDB)" as RelationalDB

    BackendAPI -- FirebaseDB
    BackendAPI -- RelationalDB
}

cloud "External Service Providers" {
    component "Africa's Talking Gateway" as AfricasTalking
    component "LocationIQ API" as LocationIQ
}

cloud "User Access Devices" {
    actor "Web Browser (Web User)" as WebUI
    actor "Mobile Phone (USSD User)" as MobilePhone
}

' Relationships between internal and external components
BackendAPI -- LocationIQ
AfricasTalking -- BackendAPI : POST /api/ussd

' User interactions
WebUI -- BackendAPI
WebUI -- BackendAPI : Real-time Updates
MobilePhone -- AfricasTalking
MobilePhone -- AfricasTalking : Receives USSD Text

@enduml
## 5. Component Diagram

This diagram outlines the major software components of the KIVU Belt Express Tracking System and their relationships.

```mermaid
graph TD
    subgraph "Frontend Application"
        FE_Map[Leaflet Map Component]
        FE_History[Location History Component]
        FE_Dashboard[Dashboard Stats Component]
        FE_Tracking[Package Tracking Page]
        FE_Auth[Authentication Components]

        FE_Tracking --> FE_Map
        FE_Tracking --> FE_History
        FE_Dashboard --> FE_History
    end

    subgraph "Backend Services (Next.js API)"
        BE_TrackingAPI[/api/tracking/{id}]
        BE_USSDAPI[/api/ussd]
        BE_AuthAPI[/api/auth/*]
        BE_DashboardAPI[/api/dashboard/stats]
        BE_DataProcessor[Location Data Processor]
        BE_Geocoding[Geocoding Service]
        BE_SMS[SMS Service]
        BE_AuthLogic[Authentication Logic]
    end

    subgraph "Data Layers"
        DL_Firebase[Firebase Realtime DB]
        DL_Relational[Relational DB (PostgreSQL)]
    end

    subgraph "External Integrations"
        EI_LocationIQ[LocationIQ API]
        EI_AfricasTalking[Africa's Talking Gateway]
    end

    FE_Tracking -- Requests Package Data --> BE_TrackingAPI
    FE_Dashboard -- Requests Stats --> BE_DashboardAPI
    FE_Auth -- Authenticates --> BE_AuthAPI

    BE_TrackingAPI -- Gets Real-time Loc --> DL_Firebase
    BE_TrackingAPI -- Gets Package Details --> DL_Relational
    BE_TrackingAPI -- Uses Geocoding/Routing --> BE_Geocoding

    BE_USSDAPI -- Uses Tracking Logic --> BE_TrackingAPI
    BE_USSDAPI -- Formats Response --> BE_SMS

    BE_DataProcessor -- Writes Location --> DL_Firebase
    BE_Geocoding -- Calls Reverse Geocode --> EI_LocationIQ
    BE_SMS -- Sends USSD/SMS --> EI_AfricasTalking

    DL_Firebase -- Stores GPS Data --> BE_DataProcessor
    DL_Relational -- Stores Packages/Users --> BE_AuthLogic

    EI_AfricasTalking -- Forwards USSD Input --> BE_USSDAPI

    classDef api fill:#e0f7fa,stroke:#00bcd4,stroke-width:1px;
    class BE_TrackingAPI,BE_USSDAPI,BE_AuthAPI,BE_DashboardAPI api;
    classDef component fill:#fff3e0,stroke:#ff9800,stroke-width:1px;
    class BE_DataProcessor,BE_Geocoding,BE_SMS,BE_AuthLogic component;
    classDef db fill:#f0f4c3,stroke:#cddc39,stroke-width:1px;
    class DL_Firebase,DL_Relational db;
    classDef external fill:#fce4ec,stroke:#e91e63,stroke-width:1px;
    class EI_LocationIQ,EI_AfricasTalking external;
    classDef frontend fill:#e3f2fd,stroke:#2196f3,stroke-width:1px;
    class FE_Map,FE_History,FE_Dashboard,FE_Tracking,FE_Auth frontend;

    linkStyle 0 stroke-width:2px,fill:none,stroke:blue;
    linkStyle 1 stroke-width:2px,fill:none,stroke:blue;
    linkStyle 2 stroke-width:2px,fill:none,stroke:blue;
    linkStyle 3 stroke-width:2px,fill:none,stroke:green;
    linkStyle 4 stroke-width:2px,fill:none,stroke:green;
    linkStyle 5 stroke-width:2px,fill:none,stroke:red;
    linkStyle 6 stroke-width:2px,fill:none,stroke:red;
```
