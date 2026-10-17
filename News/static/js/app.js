/**
 * app.js - Streamlined Controller for 'आवाज'
 * Manages:
 *  - Distinct sections for India's News & Worldwide News
 *  - Continuous right-to-left sliding marquee (Commodities, Fuel, Equities) refreshed every 15s
 *  - Headings-only Pinterest grid on homescreen
 *  - Regional and Category filtering
 *  - Soft Paper mode vs Pure Black high-contrast Dark mode toggle
 *  - Live Kolkata clock (IST) without seconds
 */

document.addEventListener("DOMContentLoaded", () => {
  let currentEdition = null;
  let activeFilter = "all";

  // DOM Elements
  const editionTimeStamp = document.getElementById("edition-time-stamp");
  const countAll = document.getElementById("count-all");
  const countIndia = document.getElementById("count-india");
  const countWorldwide = document.getElementById("count-worldwide");
  const countTech = document.getElementById("count-tech");
  const countBiz = document.getElementById("count-biz");
  const countSocial = document.getElementById("count-social");
  const mainContainer = document.getElementById("main-content-container");
  const filterPills = document.querySelectorAll(".filter-pill");
  const btnThemeToggle = document.getElementById("btn-theme-toggle");
  const marqueeTrack = document.getElementById("marquee-track");

  // Initialize Theme, Markets & Data
  initTheme();
  loadEdition();
  fetchLiveMarkets();
  setupEventListeners();

  // Poll live markets & commodities strictly every 15 seconds
  setInterval(fetchLiveMarkets, 15000);

  /* -------------------------------------------------------------
     THEME MANAGEMENT (Soft Paper vs Pure Black High Contrast)
  ------------------------------------------------------------- */
  function initTheme() {
    const saved = localStorage.getItem("aawaaz_theme") || "paper";
    if (saved === "dark") {
      document.body.classList.add("theme-dark");
      btnThemeToggle.innerHTML = '<i class="fa-solid fa-sun"></i>';
    } else {
      document.body.classList.remove("theme-dark");
      btnThemeToggle.innerHTML = '<i class="fa-solid fa-moon"></i>';
    }
  }

  function toggleTheme() {
    const isDark = document.body.classList.toggle("theme-dark");
    localStorage.setItem("aawaaz_theme", isDark ? "dark" : "paper");
    btnThemeToggle.innerHTML = isDark ? '<i class="fa-solid fa-sun"></i>' : '<i class="fa-solid fa-moon"></i>';
  }

  /* -------------------------------------------------------------
     CONTINUOUS RIGHT-TO-LEFT MARQUEE POLLER (15 SECONDS)
  ------------------------------------------------------------- */
  async function fetchLiveMarkets() {
    if (!marqueeTrack) return;
    try {
      const res = await fetch("/api/markets");
      const data = await res.json();
      if (data.success && data.indices && data.indices.length > 0) {
        const itemsHtml = data.indices.map(idx => `
          <span class="ticker-item">
            <strong class="ticker-sym">${escapeHtml(idx.name)}</strong> 
            ${idx.currency}${idx.price} 
            <span class="ticker-delta ${idx.is_positive ? 'pos' : 'neg'}">${idx.change_pct}</span>
          </span>
        `).join("");
        // Duplicate items so the CSS marquee loops continuously from right to left without gaps
        marqueeTrack.innerHTML = itemsHtml + itemsHtml;
      }
    } catch (err) {
      console.debug("Market poll notice:", err);
    }
  }

  /* -------------------------------------------------------------
     EDITION DATA LOADING
  ------------------------------------------------------------- */
  async function loadEdition() {
    try {
      const res = await fetch("/api/edition");
      const data = await res.json();
      if (data.success && data.edition) {
        currentEdition = data.edition;
        updateCounts();
        renderHeadingsGrid();
      }
    } catch (err) {
      console.error("Failed to load edition:", err);
    }
  }

  /* -------------------------------------------------------------
     KOLKATA TIMEZONE LIVE CLOCK (WITHOUT SECONDS)
  ------------------------------------------------------------- */
  function updateLiveKolkataTime() {
    if (!editionTimeStamp) return;
    try {
      const options = {
        timeZone: 'Asia/Kolkata',
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      };
      const formatter = new Intl.DateTimeFormat('en-IN', options);
      const timeStr = formatter.format(new Date());
      editionTimeStamp.innerHTML = `<i class="fa-regular fa-clock"></i> ${timeStr} IST`;
    } catch (e) {
      editionTimeStamp.textContent = "Indian Standard Time (IST)";
    }
  }

  updateLiveKolkataTime();
  setInterval(updateLiveKolkataTime, 5000);

  function updateCounts() {
    if (!currentEdition) return;
    const all = currentEdition.all_stories || [];
    const india = currentEdition.india_stories || all.filter(s => s.region === 'India');
    const worldwide = currentEdition.worldwide_stories || all.filter(s => s.region !== 'India');
    const tech = currentEdition.tech_stories || [];
    const biz = currentEdition.business_stories || [];
    const social = currentEdition.social_stories || [];

    if (countAll) countAll.textContent = all.length;
    if (countIndia) countIndia.textContent = india.length;
    if (countWorldwide) countWorldwide.textContent = worldwide.length;
    if (countTech) countTech.textContent = tech.length;
    if (countBiz) countBiz.textContent = biz.length;
    if (countSocial) countSocial.textContent = social.length;
  }

  /* -------------------------------------------------------------
     CARD BUILDER (HEADINGS ONLY ON HOMESCREEN)
  ------------------------------------------------------------- */
  function buildCardHtml(s) {
    const isSocial = s.is_social || s.source_type === "Social Media";
    const catClass = isSocial ? "social" : (s.category === "Technology" ? "tech" : "business");
    const catLabel = isSocial ? "Social Pulse" : s.category;
    const isIndia = s.is_india || s.region === "India";
    const regionClass = isIndia ? "india" : "worldwide";
    const regionLabel = isIndia ? "🇮🇳 India" : "🌐 Worldwide";

    const srcStr = s.source || "Worldwide Wire";
    const sourceIcon = isSocial 
      ? (srcStr.includes("Reddit") ? '<i class="fa-brands fa-reddit-alien"></i>' : '<i class="fa-brands fa-y-combinator"></i>') 
      : '<i class="fa-solid fa-globe"></i>';
    const timeDisplay = s.published_ago || s.published_ist || "Verified 24H";

    return `
      <a href="/article/${s.id}" class="pin-card-link" title="${escapeHtml(s.title)}">
        <article class="pin-card-heading-only">
          
          <!-- Pin Eyebrow with Regional & Category Badges -->
          <div class="pin-eyebrow">
            <div class="pin-tags-left">
              <span class="tag-region ${regionClass}">${regionLabel}</span>
              <span class="tag-cat ${catClass}">${catLabel}</span>
              <span class="tag-source">${sourceIcon} ${escapeHtml(srcStr)}</span>
            </div>
            <span class="tag-time">${escapeHtml(timeDisplay)}</span>
          </div>

          <!-- Only Heading on Homescreen -->
          <h2 class="pin-solo-headline">${escapeHtml(s.title)}</h2>

          <!-- Action Link Indicator -->
          <div class="pin-action-row">
            <span>Verified 24H</span>
            <span class="pin-read-cta">
              Read Full Article <i class="fa-solid fa-arrow-right"></i>
            </span>
          </div>

        </article>
      </a>
    `;
  }

  /* -------------------------------------------------------------
     PINTEREST HEADINGS-ONLY GRID & SECTIONS RENDERER
  ------------------------------------------------------------- */
  function renderHeadingsGrid() {
    if (!currentEdition || !mainContainer) return;

    const all = currentEdition.all_stories || [];
    const indiaList = currentEdition.india_stories || all.filter(s => s.region === 'India');
    const worldwideList = currentEdition.worldwide_stories || all.filter(s => s.region !== 'India');

    // 1. If "All Headlines" is selected, render DIFFERENT DEDICATED SECTIONS for India & Worldwide
    if (activeFilter === "all") {
      let sectionsHtml = "";

      if (indiaList.length > 0) {
        sectionsHtml += `
          <section class="editorial-section" id="section-india">
            <div class="section-banner india-banner">
              <div class="section-banner-left">
                <span class="section-banner-icon">🇮🇳</span>
                <div class="section-banner-titles">
                  <h2 class="section-banner-h2">India's Business & Tech Wire</h2>
                  <span class="section-banner-desc">National economic, enterprise, startups & domestic policy dispatches (Past 24H)</span>
                </div>
              </div>
              <span class="section-banner-count">${indiaList.length} headlines</span>
            </div>
            <div class="pinterest-grid">
              ${indiaList.map(buildCardHtml).join("")}
            </div>
          </section>
        `;
      }

      if (worldwideList.length > 0) {
        sectionsHtml += `
          <section class="editorial-section" id="section-worldwide">
            <div class="section-banner worldwide-banner">
              <div class="section-banner-left">
                <span class="section-banner-icon">🌐</span>
                <div class="section-banner-titles">
                  <h2 class="section-banner-h2">Worldwide Dispatches & Global Intelligence</h2>
                  <span class="section-banner-desc">International financial markets, Silicon Valley dispatches & global trends (Past 24H)</span>
                </div>
              </div>
              <span class="section-banner-count">${worldwideList.length} headlines</span>
            </div>
            <div class="pinterest-grid">
              ${worldwideList.map(buildCardHtml).join("")}
            </div>
          </section>
        `;
      }

      mainContainer.innerHTML = sectionsHtml || renderEmptyState("No 24-hour stories available at this time.");
      return;
    }

    // 2. If "India" section filter is chosen
    if (activeFilter === "India") {
      if (!indiaList.length) {
        mainContainer.innerHTML = renderEmptyState("No Indian headlines currently available.");
        return;
      }
      mainContainer.innerHTML = `
        <section class="editorial-section">
          <div class="section-banner india-banner">
            <div class="section-banner-left">
              <span class="section-banner-icon">🇮🇳</span>
              <div class="section-banner-titles">
                <h2 class="section-banner-h2">India's News: Business & Technology Wire</h2>
                <span class="section-banner-desc">Curated 24-hour dispatches from Indian financial markets, corporate sectors & tech innovators</span>
              </div>
            </div>
            <span class="section-banner-count">${indiaList.length} headlines</span>
          </div>
          <div class="pinterest-grid">
            ${indiaList.map(buildCardHtml).join("")}
          </div>
        </section>
      `;
      return;
    }

    // 3. If "Worldwide" section filter is chosen
    if (activeFilter === "Worldwide") {
      if (!worldwideList.length) {
        mainContainer.innerHTML = renderEmptyState("No Worldwide headlines currently available.");
        return;
      }
      mainContainer.innerHTML = `
        <section class="editorial-section">
          <div class="section-banner worldwide-banner">
            <div class="section-banner-left">
              <span class="section-banner-icon">🌐</span>
              <div class="section-banner-titles">
                <h2 class="section-banner-h2">Worldwide News & International Intelligence</h2>
                <span class="section-banner-desc">Curated 24-hour dispatches from global financial wires, Silicon Valley & worldwide correspondents</span>
              </div>
            </div>
            <span class="section-banner-count">${worldwideList.length} headlines</span>
          </div>
          <div class="pinterest-grid">
            ${worldwideList.map(buildCardHtml).join("")}
          </div>
        </section>
      `;
      return;
    }

    // 4. Category-specific filtering (Technology, Business, Social)
    let filteredStories = [];
    let bannerTitle = "";
    let bannerDesc = "";
    let bannerIcon = "";

    if (activeFilter === "Technology") {
      filteredStories = currentEdition.tech_stories || all.filter(s => s.category === "Technology");
      bannerTitle = "Technology & Frontier Computing";
      bannerDesc = "Artificial intelligence, software architecture, semiconductor breakthroughs & tech policy";
      bannerIcon = '<i class="fa-solid fa-microchip"></i>';
    } else if (activeFilter === "Business") {
      filteredStories = currentEdition.business_stories || all.filter(s => s.category === "Business");
      bannerTitle = "Business, Capital Markets & Macroeconomics";
      bannerDesc = "Equity benchmarks, central bank actions, venture financing & global commerce";
      bannerIcon = '<i class="fa-solid fa-arrow-trend-up"></i>';
    } else if (activeFilter === "social") {
      filteredStories = currentEdition.social_stories || all.filter(s => s.is_social);
      bannerTitle = "Social Pulse: Reddit & Hacker News Intelligence";
      bannerDesc = "Decentralized developer sentiment, community debates & investor discussions";
      bannerIcon = '<i class="fa-solid fa-comments"></i>';
    }

    if (!filteredStories.length) {
      mainContainer.innerHTML = renderEmptyState("No headlines found for this category.");
      return;
    }

    mainContainer.innerHTML = `
      <section class="editorial-section">
        <div class="section-banner">
          <div class="section-banner-left">
            <span class="section-banner-icon">${bannerIcon}</span>
            <div class="section-banner-titles">
              <h2 class="section-banner-h2">${bannerTitle}</h2>
              <span class="section-banner-desc">${bannerDesc}</span>
            </div>
          </div>
          <span class="section-banner-count">${filteredStories.length} headlines</span>
        </div>
        <div class="pinterest-grid">
          ${filteredStories.map(buildCardHtml).join("")}
        </div>
      </section>
    `;

    // Apply active language translations to the newly rendered cards
    if (window.applyAawaazTranslations && window.getCurrentLanguage) {
      window.applyAawaazTranslations(window.getCurrentLanguage());
    }
  }

  function renderEmptyState(message) {
    return `
      <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: 14px; border: 1px solid var(--border-card); margin: 30px 0;">
        <i class="fa-solid fa-box-open" style="font-size: 38px; color: var(--text-muted); margin-bottom: 14px;"></i>
        <h3 style="font-size: 19px; margin-bottom: 8px;">No 24H Headlines Found</h3>
        <p style="color: var(--text-muted); font-size: 14px;">${escapeHtml(message)}</p>
      </div>
    `;
  }

  /* -------------------------------------------------------------
     EVENT LISTENERS & BINDINGS
  ------------------------------------------------------------- */
  function setupEventListeners() {
    // Filter Pills
    filterPills.forEach(pill => {
      pill.addEventListener("click", () => {
        filterPills.forEach(p => p.classList.remove("active"));
        pill.classList.add("active");
        activeFilter = pill.getAttribute("data-filter");
        renderHeadingsGrid();
        window.scrollTo({ top: 120, behavior: "smooth" });
      });
    });

    // Theme Toggle
    if (btnThemeToggle) {
      btnThemeToggle.addEventListener("click", toggleTheme);
    }

    // Re-render translations on language switch event
    window.addEventListener("aawaaz:languageChanged", (e) => {
      if (window.applyAawaazTranslations) {
        window.applyAawaazTranslations(e.detail.lang);
      }
    });
  }

  function escapeHtml(str) {
    if (str === null || str === undefined) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }
});
