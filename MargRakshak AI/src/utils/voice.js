/**
 * Wrapper for Web Speech API to play voice alerts, with multi-language support.
 */
let isMuted = false;

// Some browsers load voices asynchronously -- warm the cache so the first
// alert doesn't fire before voices are ready.
let cachedVoices = [];
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    cachedVoices = window.speechSynthesis.getVoices();
  };
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function pickVoice(langCode) {
  if (!cachedVoices.length) cachedVoices = window.speechSynthesis.getVoices();
  const base = langCode.split('-')[0];
  return (
    cachedVoices.find((v) => v.lang === langCode) ||
    cachedVoices.find((v) => v.lang?.toLowerCase().startsWith(base)) ||
    null
  );
}

export const voiceAlert = {
  /**
   * @param {string} text - message to speak
   * @param {string} langCode - BCP-47 code, e.g. 'en-IN', 'hi-IN', 'mr-IN'
   */
  speak: (text, langCode = 'en-IN') => {
    if (isMuted) return;
    if (!('speechSynthesis' in window)) {
      console.warn("Web Speech API not supported in this browser.");
      return;
    }

    // Cancel currently active speech to avoid queuing delays
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = langCode;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    const matchedVoice = pickVoice(langCode);
    if (matchedVoice) utterance.voice = matchedVoice;

    window.speechSynthesis.speak(utterance);
  },

  cancel: () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  },

  setMute: (mute) => {
    isMuted = mute;
    if (mute) {
      voiceAlert.cancel();
    }
  },

  isMuted: () => isMuted,

  /** True if the device has at least one voice available for the given language */
  hasVoiceFor: (langCode) => Boolean(pickVoice(langCode)),
};
