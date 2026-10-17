/**
 * speech.js - "आवाज" Audio Voice Briefing Engine
 * Powered by Web Speech Synthesis API
 * Features:
 * - Natural journalistic readout of Headline & Executive Verdict
 * - Play / Pause / Resume / Stop controls
 * - Multi-lingual voice auto-detection (Hindi, Marathi, Gujarati, Spanish, English)
 * - Animated audio pulse waveform indicator
 */

document.addEventListener("DOMContentLoaded", () => {
  const btnPlay = document.getElementById("btn-tts-play");
  const btnStop = document.getElementById("btn-tts-stop");
  const ttsIcon = document.getElementById("tts-icon");
  const ttsStatus = document.getElementById("tts-status");
  const ttsPlayText = document.getElementById("tts-play-text");

  if (!btnPlay) return; // Only present on article page or when initialized

  let synth = window.speechSynthesis;
  let currentUtterance = null;
  let isSpeaking = false;
  let isPaused = false;
  let availableVoices = [];

  function loadVoices() {
    if (!synth) return;
    availableVoices = synth.getVoices();
  }

  loadVoices();
  if (synth && synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = loadVoices;
  }

  function getBestVoice(langCode) {
    if (!availableVoices.length) loadVoices();
    const prefix = langCode.split("-")[0].toLowerCase();
    
    // Exact match (e.g. hi-IN)
    let voice = availableVoices.find(v => v.lang.toLowerCase() === langCode.toLowerCase());
    if (voice) return voice;

    // Prefix match (e.g. hi, es, mr, gu)
    voice = availableVoices.find(v => v.lang.toLowerCase().startsWith(prefix));
    if (voice) return voice;

    // Fallback Indian English or English
    voice = availableVoices.find(v => v.lang.includes("en-IN") || v.lang.includes("en_IN"));
    if (voice) return voice;

    return availableVoices.find(v => v.lang.startsWith("en")) || availableVoices[0] || null;
  }

  function extractSpeechScript() {
    const headline = document.querySelector(".article-hero-headline")?.innerText || "";
    const verdict = document.querySelector(".verdict-text")?.innerText || "";
    const pillar1 = document.querySelector(".story-pillar .pillar-prose")?.innerText || "";

    // Clean up text
    let script = `${headline}. `;
    if (verdict) {
      script += `Executive Verdict: ${verdict}. `;
    }
    if (pillar1) {
      // First 2 sentences of what transpired
      const sents = pillar1.split(".").slice(0, 2).join(". ");
      if (sents) script += `Background: ${sents}.`;
    }
    return script.trim();
  }

  function startSpeech() {
    if (!synth) {
      alert("Text-to-speech is not supported in this browser.");
      return;
    }

    if (isPaused) {
      synth.resume();
      isPaused = false;
      isSpeaking = true;
      updateUIState("playing");
      return;
    }

    // Cancel existing
    synth.cancel();

    const textToRead = extractSpeechScript();
    if (!textToRead) return;

    const langCode = window.getTTSLanguageCode ? window.getTTSLanguageCode() : "en-IN";
    const voice = getBestVoice(langCode);

    currentUtterance = new SpeechSynthesisUtterance(textToRead);
    currentUtterance.rate = 1.05;
    currentUtterance.pitch = 1.0;
    currentUtterance.lang = langCode;
    if (voice) currentUtterance.voice = voice;

    let keepAliveTimer = null;

    currentUtterance.onstart = () => {
      isSpeaking = true;
      isPaused = false;
      updateUIState("playing");

      // Chrome/Edge TTS keep-alive timer
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      keepAliveTimer = setInterval(() => {
        if (synth && synth.speaking && !isPaused) {
          synth.pause();
          synth.resume();
        }
      }, 10000);
    };

    currentUtterance.onend = () => {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      isSpeaking = false;
      isPaused = false;
      updateUIState("idle");
    };

    currentUtterance.onerror = (e) => {
      if (keepAliveTimer) clearInterval(keepAliveTimer);
      console.warn("TTS Notice:", e);
      isSpeaking = false;
      isPaused = false;
      updateUIState("idle");
    };

    synth.speak(currentUtterance);
  }

  function pauseSpeech() {
    if (synth && isSpeaking) {
      synth.pause();
      isPaused = true;
      isSpeaking = false;
      updateUIState("paused");
    }
  }

  function stopSpeech() {
    if (synth) {
      synth.cancel();
      isSpeaking = false;
      isPaused = false;
      updateUIState("idle");
    }
  }

  function updateUIState(state) {
    if (state === "playing") {
      btnPlay.innerHTML = '<i class="fa-solid fa-pause"></i> <span>Pause</span>';
      btnStop.style.display = "inline-flex";
      ttsIcon.classList.add("pulsing");
      ttsStatus.textContent = "Broadcasting AI Voice Briefing • Active";
    } else if (state === "paused") {
      btnPlay.innerHTML = '<i class="fa-solid fa-play"></i> <span>Resume</span>';
      btnStop.style.display = "inline-flex";
      ttsIcon.classList.remove("pulsing");
      ttsStatus.textContent = "Briefing Paused";
    } else {
      btnPlay.innerHTML = '<i class="fa-solid fa-play"></i> <span>Listen</span>';
      btnStop.style.display = "none";
      ttsIcon.classList.remove("pulsing");
      ttsStatus.textContent = "AI Investigative voice readout • 1.05x speed";
    }
  }

  btnPlay.addEventListener("click", () => {
    if (isSpeaking) {
      pauseSpeech();
    } else {
      startSpeech();
    }
  });

  btnStop.addEventListener("click", stopSpeech);

  // If language switches during playback, restart in new language
  window.addEventListener("aawaaz:languageChanged", () => {
    if (isSpeaking || isPaused) {
      stopSpeech();
    }
  });
});
