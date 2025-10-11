# KIVU Belt Express Tracking System - PlantUML Diagrams

## 1. Complete System Flowchart

```plantuml
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
```

## 2. Data Flow Diagram

```plantuml
@startuml
title KIVU Belt Express Tracking System - Data Flow Diagram

skinparam monochrome true
skinparam shadowing false
skinparam actorBorderColor black
skinparam actorFontColor black
skinparam rectangleBorderColor black
skinparam rectangleFontColor black
skinparam databaseBorderColor black
skinparam databaseFontColor black
skinparam cloudBorderColor black
skinparam cloudFontColor black

actor "Web User" as WebUser
actor "Mobile User" as MobileUser
actor "GPS Device (Vehicle)" as GPSDevice

rectangle "KIVU Belt Express System" {
    rectangle "Web Frontend" as WebFE
    rectangle "Backend API" as BackendAPI
    rectangle "USSD Handler" as USSDHandler
    
    database "Firebase Realtime DB" as FirebaseDB
    database "Relational DB (Package/User Data)" as RelationalDB
}

actor "LocationIQ API" as LocationIQ
actor "Africa's Talking Gateway" as AfricasTalking

WebUser -- 1. Package Tracking Request --> WebFE
WebFE -- 2. Tracking Number --> BackendAPI
BackendAPI -- 3. Request Real-time GPS Data --> FirebaseDB
FirebaseDB -- 4. Real-time GPS Coordinates --> BackendAPI
BackendAPI -- 5. Request Package Details/History --> RelationalDB
RelationalDB -- 6. Package Details/History --> BackendAPI
BackendAPI -- 7. Request Geocoding/Routing --> LocationIQ
LocationIQ -- 8. Geocoded Address/Route/ETA --> BackendAPI
BackendAPI -- 9. Formatted Tracking Data --> WebFE
WebFE -- 10. Display Live Tracking UI --> WebUser

MobileUser -- 11. USSD Code Dial --> AfricasTalking
AfricasTalking -- 12. USSD Request (Tracking No.) --> USSDHandler
USSDHandler -- 13. Process Tracking Request --> BackendAPI : (Internal Call)
BackendAPI -- 14. Request Real-time GPS Data --> FirebaseDB
FirebaseDB -- 15. Real-time GPS Coordinates --> BackendAPI
BackendAPI -- 16. Request Package Details/History --> RelationalDB
RelationalDB -- 17. Package Details/History --> BackendAPI
BackendAPI -- 18. Request Geocoding/Routing --> LocationIQ
LocationIQ -- 19. Geocoded Address/Route/ETA --> BackendAPI
USSDHandler -- 20. Formatted USSD Response --> AfricasTalking
AfricasTalking -- 21. Display USSD Text --> MobileUser

GPSDevice -- 22. Transmits GPS Data --> FirebaseDB : (every 3 seconds)

@enduml
```

## 3. Web Package Tracking Sequence Diagram

```plantuml
@startuml
title KIVU Belt Express Tracking System - Web Package Tracking Sequence

skinparam monochrome true
skinparam shadowing false
skinparam actorBorderColor black
skinparam actorFontColor black
skinparam participantBorderColor black
skinparam participantFontColor black

actor "Web User" as User
participant "Web Frontend
(Browser UI)" as WebUI
participant "Backend API
(Next.js API)" as Backend
database "Firebase Realtime DB" as Firebase
database "Relational DB
(Package/User Data)" as Relational
collections "LocationIQ API" as LocationIQ

autonumber

User->WebUI: Accesses Tracking Interface
User->WebUI: Enters Package Tracking Number
WebUI->Backend: GET /api/tracking/{trackingNo}

activate Backend
Backend->Relational: Query Package Details (initial load)
activate Relational
Relational-->Backend: Package Details, Status, History
deactivate Relational

Backend->Firebase: Request Current GPS Location (every 3s)
activate Firebase
Firebase-->Backend: Real-time GPS Coordinates
deactivate Firebase

Backend->LocationIQ: Request Geocoded Address, Route, ETA
activate LocationIQ
LocationIQ-->Backend: Geocoded Address, Route, Estimated Time

Backend-->WebUI: Initial Package Data (JSON)
deactivate Backend

WebUI->User: Displays Package Details, Map, History, Progress

loop Real-time Updates
    WebUI->Backend: Poll for Updates (e.g., every 5s)
    activate Backend
    Backend->Firebase: Request Latest GPS Location (every 3s)
    activate Firebase
    Firebase-->Backend: Latest GPS Coordinates
    deactivate Firebase
    Backend->LocationIQ: Update Geocoding, Route, ETA
    activate LocationIQ
    LocationIQ-->Backend: Updated Geocoded Address, Route, Estimated Time
    deactivate LocationIQ
    Backend-->WebUI: Updated Package Data (JSON)
    deactivate Backend
    WebUI->User: Updates Live Tracking Map and Details
end

@enduml
```

## 4. USSD Tracking Sequence Diagram

```plantuml
@startuml
title KIVU Belt Express Tracking System - USSD Tracking Sequence

skinparam monochrome true
skinparam shadowing false
skinparam actorBorderColor black
skinparam actorFontColor black
skinparam participantBorderColor black
skinparam participantFontColor black

actor "Mobile User" as MobileUser
participant "Africa's Talking Gateway" as AfricasTalking
participant "Backend API
(USSD Handler)" as USSDHandler
database "Firebase Realtime DB" as Firebase
database "Relational DB
(Package/User Data)" as Relational
collections "LocationIQ API" as LocationIQ

autonumber

MobileUser->AfricasTalking: Dials USSD Code (*123#)
AfricasTalking->USSDHandler: POST /api/ussd (sessionId, serviceCode, phoneNumber, text=" ")
activate AfricasTalking
activate USSDHandler

USSDHandler-->AfricasTalking: CON Welcome to KIVU Belt Express. Enter tracking number:
AfricasTalking->MobileUser: Displays Welcome Message & Prompt

MobileUser->AfricasTalking: Enters Tracking Number (e.g., *123*TRACK123#)
AfricasTalking->USSDHandler: POST /api/ussd (sessionId, serviceCode, phoneNumber, text="TRACK123")

USSDHandler->Backend: Call internal tracking logic (TRACK123)
activate Backend
Backend->Relational: Query Package Details
activate Relational
Relational-->Backend: Package Details, Status, History
deactivate Relational

Backend->Firebase: Request Current GPS Location
activate Firebase
Firebase-->Backend: Real-time GPS Coordinates
deactivate Firebase

Backend->LocationIQ: Request Geocoded Address
activate LocationIQ
LocationIQ-->Backend: Geocoded Address, Progress
deactivate LocationIQ

Backend-->USSDHandler: Formatted Tracking Data
deactivate Backend

USSDHandler-->AfricasTalking: END Package Status: In Transit, Loc: [Address], Progress: [X%]
deactivate USSDHandler
AfricasTalking->MobileUser: Displays Package Status
deactivate AfricasTalking

@enduml
```

## 5. Entity Relationship Diagram

```plantuml
@startuml
title KIVU Belt Express Tracking System - Entity Relationship Diagram

skinparam monochrome true
skinparam shadowing false
skinparam classBorderColor black
skinparam classArrowColor black
skinparam entityBorderColor black
skinparam entityFontColor black

entity "User" {
    *UserID : VARCHAR(255) <<PK>>
    --
    Name : VARCHAR(255)
    Email : VARCHAR(255) <<Unique>>
    PasswordHash : VARCHAR(255)
    Role : ENUM('Customer', 'Staff', 'Admin', 'Driver')
    PhoneNumber : VARCHAR(20)
    BranchID : VARCHAR(255) <<FK>>
}

entity "Branch" {
    *BranchID : VARCHAR(255) <<PK>>
    --
    BranchName : VARCHAR(255) <<Unique>>
    Location : TEXT
    ContactNumber : VARCHAR(20)
}

entity "Package" {
    *PackageID : VARCHAR(255) <<PK>>
    --
    TrackingNumber : VARCHAR(255) <<Unique>>
    SenderName : VARCHAR(255)
    SenderAddress : TEXT
    ReceiverName : VARCHAR(255)
    ReceiverAddress : TEXT
    CurrentStatus : ENUM('Registered', 'In Transit', 'Delivered', 'Cancelled')
    Weight : DECIMAL(10,2)
    Dimensions : VARCHAR(50)
    RegistrationDate : TIMESTAMP
    AssignedDriverID : VARCHAR(255) <<FK>>
    VehicleID : VARCHAR(255) <<FK>>
    OriginBranchID : VARCHAR(255) <<FK>>
    DestinationBranchID : VARCHAR(255) <<FK>>
    DeliveryETA : TIMESTAMP
}

entity "Vehicle" {
    *VehicleID : VARCHAR(255) <<PK>>
    --
    LicensePlate : VARCHAR(50) <<Unique>>
    Make : VARCHAR(100)
    Model : VARCHAR(100)
    Capacity : DECIMAL(10,2)
    CurrentDriverID : VARCHAR(255) <<FK>>
    BranchID : VARCHAR(255) <<FK>>
}

entity "TrackingHistory" {
    *HistoryID : SERIAL <<PK>>
    --
    PackageID : VARCHAR(255) <<FK>>
    Timestamp : TIMESTAMP
    Latitude : DECIMAL(10,7)
    Longitude : DECIMAL(10,7)
    GeocodedAddress : TEXT
    EventDescription : TEXT
}

entity "Notification" {
    *NotificationID : SERIAL <<PK>>
    --
    UserID : VARCHAR(255) <<FK>>
    PackageID : VARCHAR(255) <<FK>> <<Optional>>
    Type : ENUM('PackageUpdate', 'Alert', 'System')
    Message : TEXT
    Timestamp : TIMESTAMP
    IsRead : BOOLEAN
}

User ||--o{ Branch : "belongs to"
Package ||--o{ User : "assigned to"
Package ||--o{ Vehicle : "transported by"
Package }o--|| Branch : "originates from"
Package }o--|| Branch : "destined for"
TrackingHistory }o--|| Package : "records for"
Vehicle ||--o{ User : "driven by"
Notification ||--o{ User : "for"
Notification }o--|| Package : "about"

@enduml
```

## 6. Infrastructure Architecture Diagram

```plantuml
@startuml
title KIVU Belt Express Tracking System - Infrastructure Architecture

skinparam monochrome true
skinparam shadowing false
skinparam nodeBorderColor black
skinparam nodeFontColor black
skinparam cloudBorderColor black
skinparam cloudFontColor black
skinparam databaseBorderColor black
skinparam databaseFontColor black
skinparam componentBorderColor black
skinparam componentFontColor black

node "Cloud Server Environment" as CloudServer {
    artifact "Backend API Server" as BackendAPI
    database "Firebase Realtime DB" as FirebaseDB
    database "Relational Database\n(PostgreSQL/NeonDB)" as RelationalDB

    BackendAPI -- FirebaseDB : Manages Data
    BackendAPI -- RelationalDB : Manages Data
}

node "External Service Providers" as ExternalServices {
    component "Africa's Talking Gateway" as AfricasTalking
    component "LocationIQ API" as LocationIQ
}

node "User Access Devices" as UserDevices {
    actor "Web Browser (Web User)" as WebUI
    actor "Mobile Phone (USSD User)" as MobilePhone
}

' Relationships between internal and external components
BackendAPI -- LocationIQ : Calls API
AfricasTalking -- BackendAPI : POST /api/ussd

' User interactions
WebUI -- BackendAPI : Requests Data
WebUI -- BackendAPI : Real-time Updates
MobilePhone -- AfricasTalking : Dials USSD Code
MobilePhone -- AfricasTalking : Receives USSD Text

@enduml
```

## 7. Security Architecture Diagram

```plantuml
@startuml
title KIVU Belt Express Tracking System - Security Architecture

skinparam monochrome true
skinparam shadowing false
skinparam actorBorderColor black
skinparam actorFontColor black
skinparam componentBorderColor black
skinparam componentFontColor black
skinparam cloudBorderColor black
skinparam cloudFontColor black
skinparam databaseBorderColor black
skinparam databaseFontColor black
skinparam noteBorderColor black
skinparam noteFontColor black

actor "Web User" as WebUser
actor "Mobile User" as MobileUser
actor "Admin/Staff" as AdminStaff
actor "GPS Device" as GPSDevice

cloud "Internet / Public Network" as Internet {
    component "Web Browser" as WebClient
    component "Mobile Handset" as MobileClient
}

cloud "Cloud Environment\n(e.g., Vercel, AWS, GCP)" as Cloud {
    component "Web Frontend\n(React/Next.js)" as WebFE
    component "Backend API Gateway\n(Next.js API)" as APIGateway
    component "Authentication Service" as AuthService
    component "Authorization Service\n(RBAC)" as AuthzService
    component "USSD Handler" as USSDHandler
    database "Relational DB\n(User/Package Data)" as RelationalDB
    database "Firebase Realtime DB" as FirebaseDB
    component "Logging & Monitoring" as Monitoring
    component "Firewall / WAF" as Firewall
}

cloud "External Services" as External {
    collections "LocationIQ API" as LocationIQAPI
    collections "Africa's Talking Gateway" as ATGateway
}

WebUser -- WebClient
MobileUser -- MobileClient
AdminStaff -[hidden]-> WebClient

Firewall --> APIGateway : Ingress Traffic

WebClient -- Internet : HTTPS/TLS
Internet -- Firewall : All Traffic
APIGateway -- AuthService : User Credentials
AuthService -- APIGateway : Auth Token (JWT)
APIGateway -- AuthzService : Validate Token & Permissions
AuthzService -- APIGateway : Authorization Decision

APIGateway -- RelationalDB : Secure DB Connection (TLS)
APIGateway -- FirebaseDB : Secure Connection (TLS)
APIGateway -- LocationIQAPI : API Key Protection, HTTPS
APIGateway -- ATGateway : HTTPS (for USSD responses)

MobileClient -- ATGateway : USSD Protocol (Secured by Telecom)
ATGateway -- USSDHandler : HTTPS/TLS, Signature Verification (if supported)
USSDHandler -- APIGateway : Internal API Calls
USSDHandler -- RelationalDB : (via APIGateway/internal service)
USSDHandler -- FirebaseDB : (via APIGateway/internal service)
USSDHandler -- LocationIQAPI : (via APIGateway/internal service)

GPSDevice -- FirebaseDB : Encrypted Data Transmission (HTTPS/MQTT TLS)

RelationalDB -- Monitoring : Audit Logs
FirebaseDB -- Monitoring : Access Logs
APIGateway -- Monitoring : Request/Error Logs
USSDHandler -- Monitoring : USSD Interaction Logs

note left of APIGateway
    Input Validation
    Rate Limiting
    OWASP Top 10 Protections
end note

note left of AuthService
    Password Hashing (Bcrypt)
    Session Management
end note

note right of RelationalDB
    Data at Rest Encryption
    Access Control Policies
end note

note right of FirebaseDB
    Firebase Security Rules
    Real-time Data Access Control
end note

@enduml
```

## 8. Use Case Diagram

```plantuml
@startuml
title KIVU Belt Express Tracking System - Use Case Diagram

skinparam monochrome true
skinparam shadowing false
skinparam actorBorderColor black
skinparam actorFontColor black
skinparam usecaseBorderColor black
skinparam usecaseFontColor black
skinparam packageBorderColor black
skinparam packageFontColor black

actor "Customer" as Customer
actor "Staff" as Staff
actor "Administrator" as Admin
actor "Operations Manager" as OpsManager
actor "Driver/Field Agent" as Driver

rectangle "KIVU Belt Express System" {

    package "Web Interface Use Cases" {
        usecase "Track Package via Web" as UC1
        usecase "Manage Dashboard Statistics" as UC2
        usecase "Monitor Real-time Fleet" as UC3
        usecase "Register New Package" as UC_RegisterPackage
        usecase "Manage Users" as UC_ManageUsers
        usecase "Manage Branches" as UC_ManageBranches
        usecase "Manage Vehicles" as UC_ManageVehicles
        usecase "Update Package Status" as UC_UpdatePackage
        usecase "Manage Payments" as UC_ManagePayments
        usecase "View Analytics Reports" as UC_ViewAnalytics
    }

    package "USSD Interface Use Cases" {
        usecase "Track Package via USSD" as UC4
        usecase "Check Basic Fleet Status (Future)" as UC5
    }

    Customer -- UC1
    Customer -- UC4
    Staff -- UC1
    Staff -- UC_UpdatePackage
    Admin -- UC1
    Admin -- UC2
    Admin -- UC_RegisterPackage
    Admin -- UC_ManageUsers
    Admin -- UC_ManageBranches
    Admin -- UC_ManageVehicles
    Admin -- UC_ManagePayments
    Admin -- UC_ViewAnalytics
    OpsManager -- UC2
    OpsManager -- UC3
    Driver -- UC_UpdatePackage
    Driver -- UC5

    UC_ManageUsers .u.|> (Authentication) : includes
    UC_ManageBranches .u.|> (Authentication) : includes
    UC_ManageVehicles .u.|> (Authentication) : includes
    UC_ManagePayments .u.|> (Authentication) : includes
    UC_ViewAnalytics .u.|> (Authentication) : includes
    UC_RegisterPackage .u.|> (Authentication) : includes
    UC_UpdatePackage .u.|> (Authentication) : includes
    UC2 .u.|> (Authentication) : includes
    UC3 .u.|> (Authentication) : includes
    UC1 .u.|> (Retrieve Tracking Data) : includes
    UC4 .u.|> (Retrieve Tracking Data) : includes

    (Retrieve Tracking Data) .d.> (Access Firebase) : extends
    (Retrieve Tracking Data) .d.> (Access Relational DB) : extends
    (Retrieve Tracking Data) .d.> (Utilize LocationIQ) : extends

    usecase "Authentication" as Authentication
    usecase "Access Firebase" as AccessFirebase
    usecase "Access Relational DB" as AccessRelationalDB
    usecase "Utilize LocationIQ" as UtilizeLocationIQ
}

@enduml
```

## 9. Delivery Process Flowchart

```plantuml
@startuml
title KIVU Belt Express Tracking System - Delivery Process Flowchart

skinparam monochrome true
skinparam shadowing false
skinparam activityBorderColor black
skinparam activityFontColor black
skinparam arrowColor black
skinparam activityDiamondFontColor black

start

:Customer requests package delivery;
:Staff registers new package details;
note right: Via Web UI;
:System generates unique Tracking ID;
:Package details stored in Relational DB;

:Staff assigns package to available Driver and Vehicle;
:Driver receives package and assigned route;
note right: Route optimized by LocationIQ;

:Driver starts delivery;
:GPS Device in vehicle transmits real-time location;
note right: Every 3 seconds;
:Firebase Realtime DB receives and stores GPS data;

partition "Tracking System" {
    :Backend API retrieves GPS data from Firebase;
    :Backend API retrieves package details from Relational DB;
    :Backend API calls LocationIQ for geocoding and ETA calculation;
    :Web UI displays live tracking map and status;
    :Mobile User checks status via USSD;
}

:Driver arrives at destination;
:Driver updates package status to "Delivered";
note right: Via mobile app or direct input;
:System updates package status in Relational DB;

:Customer receives package;
if (Delivery successful?) then (Yes)
  :Delivery marked as complete;
else (No)
  :Log delivery issue;
  :Initiate resolution process;
endif

stop
@enduml
```

## 10. Real-time GPS Tracking Flowchart

```plantuml
@startuml
title KIVU Belt Express Tracking System - Real-time GPS Tracking Flowchart

skinparam monochrome true
skinparam shadowing false
skinparam activityBorderColor black
skinparam activityFontColor black
skinparam arrowColor black
skinparam activityDiamondFontColor black

start

:GPS Device in Vehicle Activated;
repeat
    :GPS Device captures current Latitude and Longitude;
    :GPS Device transmits coordinates;
    note right: Every 3 seconds;
    :Firebase Realtime DB receives GPS data;
    :Firebase stores current GPS coordinates;
    if (Web/USSD Tracking Request Active?) then (Yes)
        :Backend API listens for Firebase updates;
        :Backend API retrieves latest GPS data;
        :Backend API calls LocationIQ for reverse geocoding;
        :LocationIQ returns human-readable address;
        :Backend API calculates ETA and progress;
        :Backend API sends updated tracking data;
        if (Web UI Active?) then (Yes)
            :Web UI receives and displays live location on map;
            :Web UI updates ETA and progress bar;
        else (No)
        endif
        if (USSD Session Active?) then (Yes)
            :USSD Handler processes update (if polling);
            :USSD Handler sends text to Mobile User;
        else (No)
        endif
    else (No)
    endif
repeat while (Vehicle in Transit)

:Vehicle arrives at destination;
:GPS Device deactivates / stops transmission;
:Firebase Realtime DB stops receiving updates;

stop
@enduml
```

## 11. Package Registration & Dispatch Flowchart

```plantuml
@startuml
title KIVU Belt Express Tracking System - Package Registration & Dispatch Flowchart

skinparam monochrome true
skinparam shadowing false
skinparam activityBorderColor black
skinparam activityFontColor black
skinparam arrowColor black
skinparam activityDiamondFontColor black

start

:Staff logs into Web UI;
note right: Admin/Staff Role Required;

:Staff navigates to "Register New Package" form;

:Staff enters package details;
note right: Sender, Receiver, Weight, Dimensions, Origin/Destination Branch;
:Staff submits form;

:Web UI sends package data to Backend API;
note right: POST /api/packages/register;

:Backend API validates package data;
if (Data Valid?) then (No)
  :Return validation errors to Web UI;
  stop
else (Yes)
  :Generate unique Tracking ID;
  :Save package details to Relational DB;
  note right: Initial status "Registered";
  :Backend API confirms registration;
end if

:Staff views registered package details;
note right: Includes generated Tracking ID;

:Staff assigns Driver and Vehicle to Package;
note right: Based on availability and route;

:Backend API updates package assignment in Relational DB;
:Backend API calls LocationIQ for route optimization;
note right: Calculates optimal path from origin to destination;
:LocationIQ returns optimized route;
:Backend API saves optimized route information;

:Driver notified of new assignment;
note right: Via mobile app or internal system;

:Driver picks up package;
:Driver confirms dispatch;
note right: Updates status to "In Transit";

:Backend API updates package status in Relational DB;

stop
@enduml
```
