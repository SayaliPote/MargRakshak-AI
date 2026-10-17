/**
 * Multi-language support for voice + toast alerts.
 * Nashik is in Maharashtra, so English, Hindi and Marathi are offered.
 */

export const ALERT_LANGUAGES = [
  { code: 'en', label: 'English', speechLang: 'en-IN' },
  { code: 'hi', label: 'हिंदी', speechLang: 'hi-IN' },
  { code: 'mr', label: 'मराठी', speechLang: 'mr-IN' },
];

export function getSpeechLang(code) {
  return ALERT_LANGUAGES.find((l) => l.code === code)?.speechLang || 'en-IN';
}

/**
 * Persisted user language preference (asked once at first login, editable
 * later from Settings). Stored in localStorage so it survives across
 * sessions without needing a backend.
 */
const LANG_STORAGE_KEY = 'margrakshak_alert_lang';

export function getSavedLanguage() {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return ALERT_LANGUAGES.some((l) => l.code === saved) ? saved : null;
  } catch {
    return null;
  }
}

export function saveLanguage(code) {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, code);
  } catch {
    // localStorage unavailable (e.g. private browsing) -- fail silently,
    // the app still works for the current session.
  }
}

/** Severity tier for each proximity threshold, per the alert spec. */
export function severityForThreshold(meters) {
  if (meters <= 200) return 'CRITICAL';
  if (meters <= 500) return 'MEDIUM';
  return 'LOW';
}

/**
 * Exact multilingual proximity alert copy (screen text + spoken text share
 * the same message) for the three official thresholds: 1000m / 500m / 200m.
 */
const PROXIMITY_ALERTS = {
  1000: {
    en: 'Accident-prone area ahead, 1 kilometer. Please stay alert.',
    hi: 'आगे 1 किलोमीटर पर दुर्घटना संभावित क्षेत्र है। सावधान रहें।',
    mr: 'पुढे 1 किलोमीटर अंतरावर अपघातप्रवण क्षेत्र आहे. सावध रहा.',
  },
  500: {
    en: 'Warning! Accident-prone area ahead, 500 meters. Please slow down.',
    hi: 'सावधान! आगे 500 मीटर पर दुर्घटना संभावित क्षेत्र है। कृपया गति कम करें।',
    mr: 'सावधान! पुढे 500 मीटर अंतरावर अपघातप्रवण क्षेत्र आहे. कृपया वेग कमी करा.',
  },
  200: {
    en: 'Critical warning! Accident-prone area ahead, 200 meters. Please drive carefully.',
    hi: 'अत्यधिक सावधानी! आगे 200 मीटर पर दुर्घटना संभावित क्षेत्र है। कृपया सावधानी से वाहन चलाएं।',
    mr: 'अत्यंत सावधान! पुढे 200 मीटर अंतरावर अपघातप्रवण क्षेत्र आहे. कृपया काळजीपूर्वक वाहन चालवा.',
  },
};

/** Builds the exact spec-worded proximity alert for a given threshold (1000/500/200). */
export function buildProximityAlertMessage(lang, thresholdMeters) {
  const forThreshold = PROXIMITY_ALERTS[thresholdMeters] || PROXIMITY_ALERTS[1000];
  return forThreshold[lang] || forThreshold.en;
}

const RISK_LABELS = {
  en: { LOW: 'low', MEDIUM: 'medium', HIGH: 'high', CRITICAL: 'critical' },
  hi: { LOW: 'कम', MEDIUM: 'मध्यम', HIGH: 'उच्च', CRITICAL: 'अति गंभीर' },
  mr: { LOW: 'कमी', MEDIUM: 'मध्यम', HIGH: 'उच्च', CRITICAL: 'अतिशय गंभीर' },
};

function riskLabel(lang, risk) {
  const key = (risk || '').toUpperCase();
  return (RISK_LABELS[lang] && RISK_LABELS[lang][key]) || risk || '';
}

/** Proximity warning spoken as the driver crosses 1000m / 500m / 200m of a hotspot */
export function buildHotspotAlertMessage(lang, risk, hotspotName, distanceMeters) {
  const r = riskLabel(lang, risk);
  switch (lang) {
    case 'hi':
      return `चेतावनी. आगे ${distanceMeters} मीटर पर ${r} जोखिम वाला दुर्घटना क्षेत्र है: ${hotspotName}.`;
    case 'mr':
      return `सावधान. पुढे ${distanceMeters} मीटरवर ${r} धोका असलेले अपघात क्षेत्र आहे: ${hotspotName}.`;
    default:
      return `Warning. ${r} risk accident hotspot ahead: ${hotspotName}. ${distanceMeters} meters.`;
  }
}

/** Short fixed phrases used elsewhere in the trip flow */
export const PHRASES = {
  voiceActivated: {
    en: 'Voice guidance activated. MargRakshak will monitor safety concerns along your route.',
    hi: 'आवाज़ मार्गदर्शन सक्रिय है। मार्गरक्षक आपके मार्ग पर सुरक्षा संबंधी स्थितियों की निगरानी करेगा।',
    mr: 'आवाज मार्गदर्शन सुरू झाले आहे. मार्गरक्षक तुमच्या मार्गावरील सुरक्षेच्या स्थितींवर लक्ष ठेवेल.',
  },
  tripStarted: {
    en: 'Trip started. Following your live GPS location. Drive safely.',
    hi: 'यात्रा शुरू हुई। आपकी लाइव जीपीएस लोकेशन को फॉलो किया जा रहा है। सुरक्षित यात्रा करें।',
    mr: 'प्रवास सुरू झाला. तुमचे लाइव्ह जीपीएस स्थान फॉलो केले जात आहे. सुरक्षित प्रवास करा.',
  },
  arrived: {
    en: 'You have arrived at your destination.',
    hi: 'आप अपने गंतव्य पर पहुँच गए हैं।',
    mr: 'तुम्ही तुमच्या गंतव्यस्थानी पोहोचला आहात.',
  },
  hotspotPassed: {
    en: 'Hazard zone cleared. Continuing safely.',
    hi: 'खतरे का क्षेत्र पार हो गया। यात्रा सुरक्षित रूप से जारी है।',
    mr: 'धोक्याचे क्षेत्र पार झाले. प्रवास सुरक्षितपणे सुरू आहे.',
  },
  rerouting: {
    en: 'Rerouting. Switched to the alternate path.',
    hi: 'मार्ग बदला जा रहा है। वैकल्पिक मार्ग चुना गया।',
    mr: 'मार्ग बदलला जात आहे. पर्यायी मार्ग निवडला.',
  },
  voiceWarningsActive: {
    en: 'Voice warnings active.',
    hi: 'आवाज़ चेतावनी सक्रिय है।',
    mr: 'आवाज सूचना सुरू आहेत.',
  },
  speedViolation: {
    en: 'Alert. Speed limit violation. Reduce speed immediately. Critical intersection ahead.',
    hi: 'चेतावनी. गति सीमा उल्लंघन। तुरंत गति कम करें। आगे महत्वपूर्ण चौराहा है।',
    mr: 'सावधान. वेगमर्यादा ओलांडली आहे. त्वरित वेग कमी करा. पुढे महत्त्वाचा चौक आहे.',
  },
  enteringHotspot: {
    en: 'Caution. Entering a high traffic hotspot. Heavy merging traffic.',
    hi: 'सावधान. भारी यातायात वाले क्षेत्र में प्रवेश कर रहे हैं। भारी मिश्रित यातायात।',
    mr: 'सावधान. जास्त वाहतूक असलेल्या क्षेत्रात प्रवेश करत आहात. वाहतूक दाट आहे.',
  },
  noAlternateRoute: {
    en: 'No alternate road route is available for this trip.',
    hi: 'इस यात्रा के लिए कोई वैकल्पिक मार्ग उपलब्ध नहीं है।',
    mr: 'या प्रवासासाठी कोणताही पर्यायी मार्ग उपलब्ध नाही.',
  },
  switchedAlternateRoute: {
    en: 'Switched to the alternate route.',
    hi: 'वैकल्पिक मार्ग पर स्विच किया गया।',
    mr: 'पर्यायी मार्गावर स्विच केले.',
  },
  voiceMuted: {
    en: 'Voice safety warnings muted.',
    hi: 'आवाज़ सुरक्षा चेतावनी म्यूट कर दी गई।',
    mr: 'आवाज सुरक्षा इशारे म्यूट केले.',
  },
  voiceUnmuted: {
    en: 'Voice safety warnings unmuted.',
    hi: 'आवाज़ सुरक्षा चेतावनी अनम्यूट कर दी गई।',
    mr: 'आवाज सुरक्षा इशारे अनम्यूट केले.',
  },
  passedDwarkaCircle: {
    en: 'You have safely passed through the Dwarka Circle intersection.',
    hi: 'आप द्वारका सर्कल चौराहे से सुरक्षित रूप से गुज़र चुके हैं।',
    mr: 'तुम्ही द्वारका सर्कल चौकातून सुरक्षितपणे पार झाला आहात.',
  },
  altRouteSelected: {
    en: 'Alternative safer route selected! Rerouting via Canada Corner & Sharanpur Road.',
    hi: 'वैकल्पिक सुरक्षित मार्ग चुना गया! कैनाडा कॉर्नर और शरणपुर रोड से मार्ग बदला जा रहा है।',
    mr: 'पर्यायी सुरक्षित मार्ग निवडला! कॅनडा कॉर्नर आणि शरणपूर रोडमार्गे मार्ग बदलला जात आहे.',
  },
  toDestinationPrefix: { en: 'To', hi: 'तक', mr: 'पर्यंत' },
  liveRouteLabel: { en: 'Live Route', hi: 'लाइव मार्ग', mr: 'लाइव्ह मार्ग' },
  liveGpsTrip: { en: 'Live GPS Trip', hi: 'लाइव जीपीएस यात्रा', mr: 'लाइव्ह जीपीएस प्रवास' },
  inTransitHud: { en: 'In-Transit HUD', hi: 'यात्रा के दौरान एचयूडी', mr: 'प्रवासादरम्यान एचयूडी' },
  gpsLocked: { en: 'GPS Locked', hi: 'जीपीएस लॉक्ड', mr: 'जीपीएस लॉक्ड' },
  locatingLabel: { en: 'Locating…', hi: 'स्थान खोजा जा रहा है…', mr: 'स्थान शोधले जात आहे…' },
  activeMonitoring: { en: 'Active Monitoring', hi: 'सक्रिय निगरानी', mr: 'सक्रिय देखरेख' },
  liveNavTitle: { en: 'Live Navigation & Proximity Alerts', hi: 'लाइव नेविगेशन और निकटता चेतावनी', mr: 'लाइव्ह नेव्हिगेशन आणि जवळीक इशारे' },
  demoNavTitle: { en: 'Driver Telemetry & Proximity Alerts', hi: 'चालक टेलीमेट्री और निकटता चेतावनी', mr: 'चालक टेलिमेट्री आणि जवळीक इशारे' },
  liveNavDesc: {
    en: 'Tracking your real GPS location along the selected road route.',
    hi: 'चुने गए मार्ग पर आपके वास्तविक जीपीएस स्थान को ट्रैक किया जा रहा है।',
    mr: 'निवडलेल्या मार्गावर तुमचे खरे जीपीएस स्थान ट्रॅक केले जात आहे.',
  },
  demoNavDesc: {
    en: 'Simulating live vehicular GPS telemetry and spatial proximity collision safeguards.',
    hi: 'लाइव वाहन जीपीएस टेलीमेट्री और स्थानिक निकटता सुरक्षा का अनुकरण किया जा रहा है।',
    mr: 'लाइव्ह वाहन जीपीएस टेलिमेट्री आणि जवळीक सुरक्षिततेचे अनुकरण केले जात आहे.',
  },
  gpsTelemetryFeed: { en: 'GPS Telemetry Feed', hi: 'जीपीएस टेलीमेट्री फ़ीड', mr: 'जीपीएस टेलिमेट्री फीड' },
  permissionDeniedLocation: {
    en: 'Permission denied — showing default location',
    hi: 'अनुमति अस्वीकृत — डिफ़ॉल्ट स्थान दिखाया जा रहा है',
    mr: 'परवानगी नाकारली — डीफॉल्ट स्थान दाखवले जात आहे',
  },
  waitingForGpsFix: { en: 'Waiting for GPS fix…', hi: 'जीपीएस सिग्नल की प्रतीक्षा…', mr: 'जीपीएस सिग्नलची प्रतीक्षा…' },
  autonomousDriveActive: { en: 'Autonomous Drive Simulation Active', hi: 'स्वचालित ड्राइव सिमुलेशन सक्रिय', mr: 'स्वयंचलित ड्राइव्ह सिम्युलेशन सुरू' },
  simulationPaused: { en: 'Simulation Paused', hi: 'सिमुलेशन रोका गया', mr: 'सिम्युलेशन थांबवले' },
  pauseLabel: { en: 'Pause', hi: 'रोकें', mr: 'थांबवा' },
  autoDrive: { en: 'Auto Drive', hi: 'ऑटो ड्राइव', mr: 'ऑटो ड्राइव्ह' },
  tripComplete: { en: 'Trip Complete', hi: 'यात्रा पूर्ण', mr: 'प्रवास पूर्ण' },
  youveArrived: { en: "You've Arrived", hi: 'आप पहुँच गए हैं', mr: 'तुम्ही पोहोचला आहात' },
  yourDestination: { en: 'your destination', hi: 'आपका गंतव्य', mr: 'तुमचे गंतव्यस्थान' },
  hazardProximityHud: { en: 'Hazard Proximity HUD', hi: 'खतरा निकटता एचयूडी', mr: 'धोका जवळीक एचयूडी' },
  criticalBrakingAlert: { en: 'CRITICAL BRAKING ALERT', hi: 'गंभीर ब्रेकिंग चेतावनी', mr: 'गंभीर ब्रेकिंग इशारा' },
  hotspotImminent: { en: 'HOTSPOT IMMINENT', hi: 'दुर्घटना क्षेत्र निकट है', mr: 'अपघात क्षेत्र जवळ आहे' },
  identifiedHotspot: { en: 'Identified Hotspot', hi: 'पहचाना गया दुर्घटना क्षेत्र', mr: 'ओळखलेले अपघात क्षेत्र' },
  viewHotspotDetails: { en: 'View Hotspot Details', hi: 'क्षेत्र विवरण देखें', mr: 'क्षेत्र तपशील पहा' },
  routeClear: { en: 'Route Clear', hi: 'मार्ग साफ है', mr: 'मार्ग सुरक्षित आहे' },
  noHotspotsAhead: {
    en: 'No known accident hotspots remain ahead on this route.',
    hi: 'इस मार्ग पर आगे कोई ज्ञात दुर्घटना क्षेत्र नहीं है।',
    mr: 'या मार्गावर पुढे कोणतेही ज्ञात अपघात क्षेत्र नाही.',
  },
  contributingHazards: { en: 'Contributing Hazards', hi: 'योगदान देने वाले खतरे', mr: 'कारणीभूत धोके' },
  contributingHazardsDesc: {
    en: 'High speed convergence zone • Merging NH-60 truck traffic • Wet surface advisory',
    hi: 'उच्च गति मिलन क्षेत्र • एनएच-60 ट्रक यातायात मिश्रण • गीली सतह सलाह',
    mr: 'उच्च वेग संगम क्षेत्र • एनएच-60 ट्रक वाहतूक मिसळणे • ओल्या पृष्ठभागाचा इशारा',
  },
  dynamicRerouteActive: { en: 'Dynamic Reroute Active', hi: 'गतिशील पुनर्मार्ग सक्रिय', mr: 'डायनॅमिक पुनर्मार्ग सक्रिय' },
  safeTrajectoryEngaged: { en: 'Safe Trajectory Engaged', hi: 'सुरक्षित पथ सक्रिय', mr: 'सुरक्षित मार्ग सक्रिय' },
  bypassedDwarkaDesc: {
    en: 'Successfully bypassed the critical Dwarka Circle hazard zone. You are now traversing Canada Corner and Sharanpur Road with optimal clearance.',
    hi: 'द्वारका सर्कल के गंभीर खतरे वाले क्षेत्र को सफलतापूर्वक बायपास किया गया। अब आप कैनाडा कॉर्नर और शरणपुर रोड से सुरक्षित रूप से गुज़र रहे हैं।',
    mr: 'द्वारका सर्कलच्या गंभीर धोक्याचे क्षेत्र यशस्वीरित्या बायपास केले. आता तुम्ही कॅनडा कॉर्नर आणि शरणपूर रोडमार्गे सुरक्षितपणे जात आहात.',
  },
  speedometerTitle: { en: 'Speedometer & Zone Limits', hi: 'स्पीडोमीटर और क्षेत्र सीमाएँ', mr: 'स्पीडोमीटर आणि क्षेत्र मर्यादा' },
  liveGpsSpeedReading: { en: 'Live GPS speed reading', hi: 'लाइव जीपीएस गति रीडिंग', mr: 'लाइव्ह जीपीएस वेग रीडिंग' },
  radarSpeedBuffer: { en: 'Radar speed buffer monitoring', hi: 'रडार गति बफर निगरानी', mr: 'रडार वेग बफर देखरेख' },
  yourVelocity: { en: 'Your Velocity', hi: 'आपकी गति', mr: 'तुमचा वेग' },
  violationLabel: { en: 'Violation', hi: 'उल्लंघन', mr: 'उल्लंघन' },
  normalLabel: { en: 'Normal', hi: 'सामान्य', mr: 'सामान्य' },
  distanceToDestination: { en: 'Distance to Destination', hi: 'गंतव्य की दूरी', mr: 'गंतव्यस्थानाचे अंतर' },
  safeZoneLimit: { en: 'Safe Zone Limit', hi: 'सुरक्षित क्षेत्र सीमा', mr: 'सुरक्षित क्षेत्र मर्यादा' },
  alternateRouteLabel: { en: 'Alternate route', hi: 'वैकल्पिक मार्ग', mr: 'पर्यायी मार्ग' },
  originalRouteLabel: { en: 'Original route', hi: 'मूल मार्ग', mr: 'मूळ मार्ग' },
  arterialLimit: { en: 'Arterial Limit', hi: 'धमनी सीमा', mr: 'धमनी मर्यादा' },
  hotspotThreshold: { en: 'Hotspot Threshold', hi: 'दुर्घटना क्षेत्र सीमा', mr: 'अपघात क्षेत्र मर्यादा' },
  speedLimitExceeded: { en: 'SPEED LIMIT EXCEEDED! PLEASE SLOW DOWN', hi: 'गति सीमा पार हो गई! कृपया धीमे चलें', mr: 'वेगमर्यादा ओलांडली! कृपया वेग कमी करा' },
  muteVoice: { en: 'Mute Voice', hi: 'आवाज़ म्यूट करें', mr: 'आवाज म्यूट करा' },
  unmuteVoice: { en: 'Unmute Voice', hi: 'आवाज़ अनम्यूट करें', mr: 'आवाज अनम्यूट करा' },
  reroutePath: { en: 'Reroute Path', hi: 'मार्ग बदलें', mr: 'मार्ग बदला' },
  reroutedLabel: { en: 'Rerouted', hi: 'मार्ग बदला गया', mr: 'मार्ग बदलला' },
};

/** "Safely passed {name}." toast, in the driver's chosen language */
export function buildSafelyPassedMessage(lang, hotspotName) {
  switch (lang) {
    case 'hi':
      return `${hotspotName} सुरक्षित रूप से पार किया गया।`;
    case 'mr':
      return `${hotspotName} सुरक्षितपणे पार केले.`;
    default:
      return `Safely passed ${hotspotName}.`;
  }
}

/** "You reached {destination} safely." message, in the driver's chosen language */
export function buildReachedDestinationMessage(lang, destinationLabel) {
  switch (lang) {
    case 'hi':
      return `आप ${destinationLabel} सुरक्षित रूप से पहुँच गए।`;
    case 'mr':
      return `तुम्ही ${destinationLabel} सुरक्षितपणे पोहोचला आहात.`;
    default:
      return `You reached ${destinationLabel} safely.`;
  }
}

/** "{km} km to destination." message, in the driver's chosen language */
export function buildKmToDestinationMessage(lang, km) {
  switch (lang) {
    case 'hi':
      return `गंतव्य तक ${km} किमी।`;
    case 'mr':
      return `गंतव्यस्थानापर्यंत ${km} किमी.`;
    default:
      return `${km} km to destination.`;
  }
}

export function t(key, lang) {
  return (PHRASES[key] && (PHRASES[key][lang] || PHRASES[key].en)) || '';
}
