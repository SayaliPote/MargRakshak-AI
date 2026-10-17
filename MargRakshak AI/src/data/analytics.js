export const mockModelPerformance = {
  modelName: "RiskPredict-v2.4",
  accuracy: 91.4,
  precision: 89.7,
  recall: 90.2,
  f1Score: 89.9,
  threshold: 0.75,
  status: "Optimal",
  lastRetrained: "2026-08-24 04:00 AM",
  algorithmUsed: "HDBSCAN + Random Forest Spatial Regressor"
};

export const mockRiskFactors = [
  { category: "Weather", factor: "Rain / Wet Roads", percentage: 62, icon: "CloudRain", color: "bg-blue-500" },
  { category: "Road", factor: "Construction Zone", percentage: 28, icon: "Construction", color: "bg-orange-500" },
  { category: "Time", factor: "Night / Poor Visibility", percentage: 54, icon: "Moon", color: "bg-indigo-950" }
];

export const mockClusteringMethods = [
  { name: "K-Means", active: false, details: "Spatial partitioning into K predefined clusters. Poor with arbitrary shapes." },
  { name: "DBSCAN", active: false, details: "Density-based grouping. Good for noise but struggles with variable density." },
  { name: "HDBSCAN", active: true, details: "Hierarchical density clustering. Identifies variable-density hotspots. Active." }
];

// Hour of day (0-23) mapped to accident frequency (simulating spatio-temporal trends)
export const mockTemporalTrends = [
  { hour: 0, incidents: 12 },
  { hour: 1, incidents: 8 },
  { hour: 2, incidents: 5 },
  { hour: 3, incidents: 3 },
  { hour: 4, incidents: 4 },
  { hour: 5, incidents: 8 },
  { hour: 6, incidents: 15 },
  { hour: 7, incidents: 28 },
  { hour: 8, incidents: 48 }, // morning peak
  { hour: 9, incidents: 55 },
  { hour: 10, incidents: 42 },
  { hour: 11, incidents: 35 },
  { hour: 12, incidents: 38 },
  { hour: 13, incidents: 40 },
  { hour: 14, incidents: 32 },
  { hour: 15, incidents: 45 },
  { hour: 16, incidents: 50 },
  { hour: 17, incidents: 68 }, // evening peak
  { hour: 18, incidents: 75 },
  { hour: 19, incidents: 70 },
  { hour: 20, incidents: 58 },
  { hour: 21, incidents: 44 },
  { hour: 22, incidents: 30 },
  { hour: 23, incidents: 20 }
];
