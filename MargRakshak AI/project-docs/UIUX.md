AI-Based Accident Risk Prediction System — UI/UX
1. Overview

The UI/UX of the AI-Based Accident Risk Prediction System for Nashik City is designed for two primary users: drivers/commuters and traffic authorities/administrators. The interface focuses on map-based visualization, real-time accident-risk alerts, safe-route selection, and analytical dashboards.

The system provides a simple navigation experience for drivers while giving authorities detailed GIS and machine-learning analysis tools.

2. Driver/User Interface

The driver interface contains four major sections:

Navigation — Displays the user's current location and destination on an interactive map.
Alert Hub — Shows active accident-risk and over-speed warnings.
Safe Routes — Compares routes according to accident risk.
History & Settings — Provides previous alerts and user preferences.

The navigation screen allows users to select their source and destination and choose between the safest route and fastest route. The supplied UI design demonstrates a route from College Road to Nashik Road Railway Station, including route distance, risk level, and hotspots along the route.

3. Interactive Map

The map is the central component of the application. It displays:

Current user location
Accident hotspots
High-risk zones
Risk levels
Accident density/heatmaps
Road and speed-limit information

Hotspots are represented using different visual indicators for LOW, MEDIUM, HIGH, and CRITICAL risk.

4. Real-Time Alerts

When a driver approaches a dangerous location, the system generates a safety warning containing:

Hotspot location
Distance from the hotspot
Risk level
Relevant risk factors
Current speed
Speed-limit violation

The design includes voice/audio alerts, notifications, and options to mute an alert or reroute through an alternate path.

5. Safe Route Experience

The Safe Route Planner compares alternative routes using risk score and number of hotspots. Users can select a route based on safety rather than only travel time. The supplied design compares three routes and identifies the safest route using its risk score.

6. Administrator Interface

Administrators receive:

GIS hotspot map
Spatio-temporal analysis
Model-performance information
Hotspot directory
Accident-data upload
Report generation

The interface uses filters such as date range, clustering algorithm, hotspot layers, and KDE heatmaps.