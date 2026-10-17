/**
 * language.js - Multi-Language Engine for 'आवाज'
 * Supports: English (en), हिन्दी (hi), मराठी (mr), ગુજરાતી (gu), Español (es)
 * Integrates zero-flicker native translation and Web Speech voice syncing.
 */

(function () {
  const SUPPORTED_LANGS = {
    en: { name: "English", tts: "en-IN" },
    hi: { name: "हिन्दी", tts: "hi-IN" },
    mr: { name: "मराठी", tts: "mr-IN" },
    gu: { name: "ગુજરાતી", tts: "gu-IN" },
    es: { name: "Español", tts: "es-ES" }
  };

  const UI_DICTIONARY = {
    "Resets every 24 hours": {
      hi: "हर 24 घंटे में रीसेट होता है",
      mr: "दर 24 तासांनी रीसेट होते",
      gu: "દર 24 કલાકે રીસેટ થાય છે",
      es: "Se reinicia cada 24 horas"
    },
    "All Headlines": {
      hi: "सभी सुर्खियां",
      mr: "सर्व ठळक बातम्या",
      gu: "તમામ હેડલાઇન્સ",
      es: "Todos los titulares"
    },
    "India's News": {
      hi: "भारत के समाचार",
      mr: "भारताच्या बातम्या",
      gu: "ભારતના સમાચાર",
      es: "Noticias de India"
    },
    "Worldwide News": {
      hi: "वैश्विक समाचार",
      mr: "जागतिक बातम्या",
      gu: "વિશ્વના સમાચાર",
      es: "Noticias Mundiales"
    },
    "Technology": {
      hi: "प्रौद्योगिकी",
      mr: "तंत्रज्ञान",
      gu: "ટેકનોલોજી",
      es: "Tecnología"
    },
    "Business": {
      hi: "व्यापार एवं बाजार",
      mr: "व्यवसाय आणि बाजार",
      gu: "વેપાર અને બજાર",
      es: "Negocios y Mercados"
    },
    "Social Pulse": {
      hi: "सोशल पल्स",
      mr: "सोशल पल्स",
      gu: "સોશિયલ પલ્સ",
      es: "Pulso Social"
    },
    "Search headlines...": {
      hi: "सुर्खियां खोजें...",
      mr: "ठळक बातम्या शोधा...",
      gu: "હેડલાઇન્સ શોધો...",
      es: "Buscar titulares..."
    },
    "Read Full Article": {
      hi: "पूरा लेख पढ़ें",
      mr: "पूर्ण लेख वाचा",
      gu: "સંપૂર્ણ લેખ વાંચો",
      es: "Leer artículo completo"
    },
    "Verified 24H": {
      hi: "सत्यापित 24 घंटे",
      mr: "पडताळणी 24 तास",
      gu: "ચકાસાયેલ 24 કલાક",
      es: "Verificado 24H"
    },
    "Front Page": {
      hi: "मुख पृष्ठ",
      mr: "मुख्य पान",
      gu: "મુખ્ય પાનું",
      es: "Portada"
    },
    "Return to Front Page": {
      hi: "मुख्य पृष्ठ पर लौटें",
      mr: "मुख्य पानावर परत जा",
      gu: "મુખ્ય પૃષ્ઠ પર પાછા ફરો",
      es: "Volver a la portada"
    },
    "The Executive Verdict": {
      hi: "कार्यकारी निष्कर्ष (The Executive Verdict)",
      mr: "कार्यकारी निष्कर्ष (The Executive Verdict)",
      gu: "કાર્યકારી તારણ (The Executive Verdict)",
      es: "El veredicto ejecutivo"
    },
    "What Transpired in the Past 24 Hours": {
      hi: "पिछले 24 घंटों में क्या हुआ",
      mr: "गेल्या 24 तासांत काय घडले",
      gu: "છેલ્લા 24 કલાકમાં શું બન્યું",
      es: "Lo que ocurrió en las últimas 24 horas"
    },
    "Investigative Dissection & Global Context": {
      hi: "खोजी विश्लेषण एवं वैश्विक संदर्भ",
      mr: "शोधक विश्लेषण आणि जागतिक संदर्भ",
      gu: "તપાસાત્મક પૃથ્થકરણ અને વૈશ્વિક સંદર્ભ",
      es: "Disección investigativa y contexto global"
    },
    "Macroeconomic & Technology Stakes": {
      hi: "व्यापक आर्थिक एवं प्रौद्योगिकी प्रभाव",
      mr: "मॅक्रोइकॉनॉमिक आणि तंत्रज्ञान प्रभाव",
      gu: "મેક્રોઇકોનોમિક અને ટેકનોલોજી દાવ",
      es: "Riesgos macroeconómicos y tecnológicos"
    },
    "Listen to Editorial Briefing": {
      hi: "संपादकीय ब्रीफिंग सुनें (आवाज)",
      mr: "संपादकीय ब्रीफिंग ऐका (आवाज)",
      gu: "સંપાદકીય બ્રીફિંગ સાંભળો (આવાઝ)",
      es: "Escuchar resumen editorial"
    },
    "AI can make mistakes, so double verify each news.": {
      hi: "AI गलतियां कर सकता है, इसलिए प्रत्येक खबर को दोबारा सत्यापित करें।",
      mr: "AI चुका करू शकते, त्यामुळे प्रत्येक बातमीची पुन्हा पडताळणी करा.",
      gu: "AI ભૂલો કરી શકે છે, તેથી દરેક સમાચારની બે વાર ચકાસણી કરો.",
      es: "La IA puede cometer errores, así que verifique dos veces cada noticia."
    }
  };

  let currentLang = localStorage.getItem("aawaaz_lang") || "en";

  window.getCurrentLanguage = function () {
    return currentLang;
  };

  window.getTTSLanguageCode = function () {
    return (SUPPORTED_LANGS[currentLang] && SUPPORTED_LANGS[currentLang].tts) || "en-IN";
  };

  function setLanguage(lang) {
    if (!SUPPORTED_LANGS[lang]) lang = "en";
    currentLang = lang;
    localStorage.setItem("aawaaz_lang", lang);

    // Sync select dropdown
    const select = document.getElementById("lang-switcher");
    if (select && select.value !== lang) {
      select.value = lang;
    }

    // Apply Static UI Translations
    applyStaticTranslations(lang);

    // Trigger Google Translate engine for comprehensive dynamic article translation
    triggerGoogleTranslate(lang);

    // Notify listeners (TTS, Grid, etc.)
    window.dispatchEvent(new CustomEvent("aawaaz:languageChanged", { detail: { lang: lang, tts: getTTSLanguageCode() } }));
  }

  const originalTextMap = new WeakMap();

  function applyStaticTranslations(lang) {
    const textNodes = [];
    const walk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let n;
    while (n = walk.nextNode()) {
      // Ignore script and style tags
      if (n.parentElement && (n.parentElement.tagName === "SCRIPT" || n.parentElement.tagName === "STYLE")) {
        continue;
      }
      textNodes.push(n);
    }

    textNodes.forEach(node => {
      if (!originalTextMap.has(node)) {
        originalTextMap.set(node, node.nodeValue);
      }
      const orig = originalTextMap.get(node);
      const trimmed = orig.trim();

      if (lang === "en") {
        if (node.nodeValue !== orig) {
          node.nodeValue = orig;
        }
        return;
      }

      if (UI_DICTIONARY[trimmed] && UI_DICTIONARY[trimmed][lang]) {
        node.nodeValue = orig.replace(trimmed, UI_DICTIONARY[trimmed][lang]);
      } else {
        // Check substring matches for compound text
        for (const [key, transMap] of Object.entries(UI_DICTIONARY)) {
          if (transMap[lang] && orig.includes(key)) {
            node.nodeValue = orig.replace(key, transMap[lang]);
            break;
          }
        }
      }
    });

    // Inputs
    const searchInput = document.getElementById("filter-search");
    if (searchInput) {
      if (lang === "en") {
        searchInput.placeholder = "Search headlines...";
      } else if (UI_DICTIONARY["Search headlines..."] && UI_DICTIONARY["Search headlines..."][lang]) {
        searchInput.placeholder = UI_DICTIONARY["Search headlines..."][lang];
      }
    }
  }

  window.applyAawaazTranslations = applyStaticTranslations;

  function triggerGoogleTranslate(lang) {
    if (lang === "en") {
      // Clear Google translation cookie
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
      document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; domain=." + document.domain + "; path=/;";
      const frame = document.querySelector(".goog-te-banner-frame");
      if (frame) frame.style.display = "none";
      return;
    }

    // Set google translate cookie
    document.cookie = `googtrans=/en/${lang}; path=/;`;
    document.cookie = `googtrans=/en/${lang}; domain=.${document.domain}; path=/;`;

    // Inject Google Translate script once if not yet present
    if (!document.getElementById("google-translate-script")) {
      const s = document.createElement("script");
      s.id = "google-translate-script";
      s.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      document.body.appendChild(s);
    } else {
      // Trigger select change if element exists
      const combo = document.querySelector(".goog-te-combo");
      if (combo) {
        combo.value = lang;
        combo.dispatchEvent(new Event("change"));
      }
    }
  }

  // Global callback for Google Translate widget
  window.googleTranslateElementInit = function () {
    new google.translate.TranslateElement({
      pageLanguage: "en",
      includedLanguages: "en,hi,mr,gu,es",
      autoDisplay: false
    }, "google_translate_element");

    setTimeout(() => {
      if (currentLang !== "en") {
        const combo = document.querySelector(".goog-te-combo");
        if (combo) {
          combo.value = currentLang;
          combo.dispatchEvent(new Event("change"));
        }
      }
    }, 400);
  };

  document.addEventListener("DOMContentLoaded", () => {
    // Hidden container for Google Translate
    if (!document.getElementById("google_translate_element")) {
      const div = document.createElement("div");
      div.id = "google_translate_element";
      div.style.display = "none";
      document.body.appendChild(div);
    }

    const select = document.getElementById("lang-switcher");
    if (select) {
      select.value = currentLang;
      select.addEventListener("change", (e) => {
        setLanguage(e.target.value);
      });
    }

    if (currentLang !== "en") {
      setLanguage(currentLang);
    }
  });

  window.setAawaazLanguage = setLanguage;
})();
