AI-Based Accident Risk Prediction System — Tech Stack
1. Frontend
React.js

Used to build the interactive web application and reusable UI components.

Responsibilities include:

User dashboard
Navigation interface
Interactive maps
Risk visualization
Alerts
Route comparison
Administrative screens
Tailwind CSS

Used for responsive styling and modern UI components.

2. GIS and Mapping
Leaflet.js

Provides the interactive map interface for displaying Nashik City accident locations, hotspots, risk zones, and other geographic layers.

OpenStreetMap

Provides the underlying map tiles and geographic map data.

Browser Geolocation API

Obtains the user's real-time latitude, longitude, accuracy, and location updates.

Haversine Formula / Turf.js

Calculates the geographic distance between the current user position and accident hotspots. This supports location-based warnings.

3. Offline Client Technologies
IndexedDB

Stores hotspot and relevant safety data locally in the browser for offline access.

Service Worker

Caches application resources and supports offline operation.

Web Notifications / Web Speech API

Provides browser notifications and voice-based safety alerts. Audio and vibration feedback can additionally warn drivers when approaching dangerous zones.

4. Backend
Python + FastAPI

FastAPI provides the REST backend connecting the React application with AI processing and the database.

Major API categories include:

Authentication APIs
Accident APIs
Hotspot APIs
Risk-prediction APIs
Administrative APIs
Data-upload APIs
JWT

Provides secure authentication and authorization for users and traffic authorities.

5. AI, Data Science and GIS Processing

The AI pipeline uses:

Python — primary ML/data-processing language
Pandas — data manipulation and preprocessing
NumPy — numerical computation
Scikit-learn — machine-learning algorithms and evaluation
HDBSCAN — density-based hotspot clustering
GeoPandas — geospatial data processing
PySAL — spatial statistics and analysis
KDE — accident-density estimation

The UML explicitly defines K-Means, DBSCAN, HDBSCAN, KDE analysis, Geo/GIS data, and the risk-prediction model as core analytical components.

6. Database
PostgreSQL + PostGIS

PostgreSQL stores application and accident data, while PostGIS enables spatial storage, geographic queries, and GIS analysis.

Core entities include Users, Accidents, Hotspots, Risk Zones, Roads, and Spatial Data.

7. Deployment and Development
Docker — containerization
Nginx — reverse proxy
Git/GitHub — version control and source-code management
Postman — API testing
Pytest — backend testing
Logging — monitoring and debugging

The architecture also keeps WebSocket/FCM as optional communication mechanisms for future real-time updates and push notifications rather than making them mandatory to the core system.

Core Stack

React.js + Tailwind CSS + Leaflet.js + OpenStreetMap + Browser Geolocation API + IndexedDB + Service Worker + FastAPI + PostgreSQL/PostGIS + Python + Scikit-learn + HDBSCAN + GeoPandas + PySAL.