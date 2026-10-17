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
};

export function t(key, lang) {
  return (PHRASES[key] && (PHRASES[key][lang] || PHRASES[key].en)) || '';
}
