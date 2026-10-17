AI-Based Accident Risk Prediction System — Architecture
1. System Overview

The system follows a layered architecture consisting of the client/frontend, backend services, GIS and machine-learning pipeline, database, and real-time alert subsystem.

The primary workflow is:

User → Location Tracking → Backend → GIS/AI Processing → Risk Prediction → Hotspot Detection → Safety Alert

The UML architecture models major components including User, LocationTracker, AccidentRecord, GISData, DataPreprocessor, clustering algorithms, RiskPredictionModel, InteractiveMap, NavigationService, SafetyAlert, and AlertManager.

2. Frontend Layer

The web client is implemented using React.js with an interactive GIS map. The browser obtains the user's latitude, longitude, timestamp, and speed through the location-tracking component.

The frontend manages:

Interactive map
Current location
Hotspot visualization
Risk-zone visualization
Route information
Safety notifications
Offline hotspot data

For distance calculation, the client can use the Haversine formula/Turf.js to determine the distance between the user and nearby accident hotspots.

3. Backend Layer

The backend provides REST APIs for:

User authentication
Accident data
Hotspot information
Risk prediction
Administrative operations
File uploads
Reports

FastAPI acts as the backend service and communicates between the React client, machine-learning pipeline, and database.

JWT authentication is used for secure user and administrator access.

4. GIS and AI Processing Layer

Historical accident records are cleaned and transformed into a machine-learning dataset. Spatial information such as latitude, longitude, road information, and traffic-related attributes is processed using Python GIS and data-analysis libraries.

The clustering layer supports:

K-Means
DBSCAN
HDBSCAN

KDE is used for accident-density visualization, while spatio-temporal analysis identifies accident patterns and emerging hotspots. The UML explicitly models KDE analysis and a SpatioTemporalAnalyzer for time-and-location-based hotspot detection.

5. Database Layer

PostgreSQL with PostGIS stores:

Users
Accident records
Hotspots
Risk zones
Road/GIS data
Spatial information
Prediction results

PostGIS enables spatial queries and geographic analysis.

6. Real-Time Alert Flow

The AlertManager checks the user's location against accident-prone zones and speed-limit information. When conditions satisfy the configured risk threshold, SafetyAlert generates and displays a warning.

The browser can provide notifications, audio/voice alerts, and vibration feedback. IndexedDB and Service Worker support offline access to previously stored hotspot information.