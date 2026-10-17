"""
edition_store.py - 00:00 Midnight Reset Cycle & Multi-Model Consensus Storage for 'आवाज'
Enforces strict daily reset at 00:00 Midnight IST, caches multi-model dossiers,
and tracks real-time countdown to midnight.
"""

import sys
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import os
import json
import datetime
from typing import Dict, Any, Optional
import news_fetcher

STORAGE_DIR = os.path.join(os.path.dirname(__file__), "data")
EDITION_FILE = os.path.join(STORAGE_DIR, "current_edition.json")
CONFIG_FILE = os.path.join(STORAGE_DIR, "settings.json")
DOSSIERS_FILE = os.path.join(STORAGE_DIR, "cached_dossiers.json")

os.makedirs(STORAGE_DIR, exist_ok=True)

IST_TIMEZONE = datetime.timezone(datetime.timedelta(hours=5, minutes=30))

class EditionStore:
    def __init__(self):
        self.edition_file = EDITION_FILE
        self.config_file = CONFIG_FILE
        self.dossiers_file = DOSSIERS_FILE
        self._current_edition: Optional[Dict[str, Any]] = None
        self._dossiers_cache: Dict[str, Any] = {}
        self._config: Dict[str, Any] = {}
        self.load_all()

    def load_all(self):
        """Loads edition, dossiers, and configuration from disk."""
        if os.path.exists(self.config_file):
            try:
                with open(self.config_file, "r", encoding="utf-8") as f:
                    self._config = json.load(f)
            except Exception:
                self._config = {}
        else:
            self._config = {"gemini_key": "", "groq_key": "", "third_key": ""}

        if os.path.exists(self.dossiers_file):
            try:
                with open(self.dossiers_file, "r", encoding="utf-8") as f:
                    self._dossiers_cache = json.load(f)
            except Exception:
                self._dossiers_cache = {}

        if os.path.exists(self.edition_file):
            try:
                with open(self.edition_file, "r", encoding="utf-8") as f:
                    self._current_edition = json.load(f)
            except Exception:
                self._current_edition = None

    def save_edition(self):
        if self._current_edition:
            with open(self.edition_file, "w", encoding="utf-8") as f:
                json.dump(self._current_edition, f, indent=2, ensure_ascii=False)

    def save_dossiers(self):
        with open(self.dossiers_file, "w", encoding="utf-8") as f:
            json.dump(self._dossiers_cache, f, indent=2, ensure_ascii=False)

    def save_config(self, new_config: Dict[str, Any]):
        self._config.update(new_config)
        with open(self.config_file, "w", encoding="utf-8") as f:
            json.dump(self._config, f, indent=2, ensure_ascii=False)

    def get_config(self) -> Dict[str, Any]:
        gemini_k = self._config.get("gemini_key", "")
        groq_k = self._config.get("groq_key", "")
        third_k = self._config.get("third_key", "")
        return {
            "has_gemini_key": bool(gemini_k),
            "has_groq_key": bool(groq_k),
            "has_third_key": bool(third_k),
            "gemini_key_masked": f"{gemini_k[:6]}...{gemini_k[-4:]}" if len(gemini_k) > 10 else ("Configured" if gemini_k else "Not Set"),
            "groq_key_masked": f"{groq_k[:6]}...{groq_k[-4:]}" if len(groq_k) > 10 else ("Configured" if groq_k else "Not Set"),
            "third_key_masked": f"{third_k[:6]}...{third_k[-4:]}" if len(third_k) > 10 else ("Configured" if third_k else "Not Set"),
        }

    def get_raw_keys(self) -> Dict[str, str]:
        return {
            "gemini": self._config.get("gemini_key", "") or os.environ.get("GEMINI_API_KEY", ""),
            "groq": self._config.get("groq_key", "") or os.environ.get("GROQ_API_KEY", ""),
            "openrouter": self._config.get("third_key", "") or os.environ.get("OPENROUTER_API_KEY", ""),
        }

    def is_edition_expired(self) -> bool:
        """
        Edition expires strictly at 00:00 Midnight everyday.
        If today's calendar date is different from edition's date, it must reset.
        """
        if not self._current_edition or not self._current_edition.get("edition_date_str"):
            return True
        now_ist = datetime.datetime.now(IST_TIMEZONE)
        today_date_str = now_ist.strftime("%Y-%m-%d")
        return self._current_edition.get("edition_date_str") != today_date_str

    def get_reset_timing(self) -> Dict[str, Any]:
        """
        Computes remaining time strictly until 00:00:00 midnight everyday.
        """
        now_ist = datetime.datetime.now(IST_TIMEZONE)
        # Next midnight is tomorrow at 00:00:00
        next_midnight = (now_ist + datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        remaining_sec = max(0, int((next_midnight - now_ist).total_seconds()))
        hours = remaining_sec // 3600
        minutes = (remaining_sec % 3600) // 60
        seconds = remaining_sec % 60
        
        return {
            "remaining_seconds": remaining_sec,
            "formatted_countdown": f"{hours:02d}h {minutes:02d}m {seconds:02d}s",
            "midnight_target_iso": next_midnight.isoformat(),
            "reset_schedule": "Daily at 00:00 IST"
        }

    def get_or_create_edition(self, force_refresh: bool = False) -> Dict[str, Any]:
        """
        Auto-refreshes strictly at 00:00 midnight everyday.
        """
        if force_refresh or self.is_edition_expired():
            print("Resetting at 00:00 Cycle: Compiling fresh 24-Hour Worldwide & Social Media Edition...")
            self._current_edition = news_fetcher.fetch_24h_edition_news()
            self.save_edition()
            self.prune_stale_dossiers()
            self.precache_top_stories_async()

        edition = dict(self._current_edition)
        edition["reset_timing"] = self.get_reset_timing()
        return edition

    def precache_top_stories_async(self):
        """Asynchronously pre-caches AI dossiers for top headlines without exhausting API rate limits."""
        import threading
        threading.Thread(target=self._precache_worker, daemon=True).start()

    def _precache_worker(self):
        if not self._current_edition:
            return
        try:
            import ai_analyst
            import time
            raw_keys = self.get_raw_keys()
            has_api_keys = any(bool(v) for v in raw_keys.values())

            # Focus on top 5 Indian and top 5 Worldwide stories to preserve daily API quotas
            top_india = self._current_edition.get("india_stories", [])[:5]
            top_worldwide = self._current_edition.get("worldwide_stories", [])[:5]
            candidates = top_india + top_worldwide
            new_cached = 0

            for article in candidates:
                aid = article.get("id")
                if aid and aid not in self._dossiers_cache:
                    try:
                        dossier = ai_analyst.analyze_article_consensus(article, custom_keys=raw_keys)
                        self.cache_dossier(aid, dossier)
                        new_cached += 1
                        # Throttle if external API keys are active to respect 15 RPM limits
                        if has_api_keys:
                            time.sleep(1.2)
                    except Exception as err:
                        err_str = str(err).lower()
                        print(f"Notice pre-caching article {aid}: {err}")
                        if "429" in err_str or "quota" in err_str or "rate limit" in err_str:
                            print("Daily API limit or rate limit encountered. Pausing background pre-caching to preserve quota.")
                            break

            if new_cached > 0:
                print(f"Background Pre-caching Finished: {new_cached} stories pre-computed (<50ms reader latency).")
        except Exception as err:
            print(f"Pre-cache worker notice: {err}")

    def get_cached_dossier(self, article_id: str) -> Optional[Dict[str, Any]]:
        return self._dossiers_cache.get(article_id)

    def cache_dossier(self, article_id: str, dossier: Dict[str, Any]):
        dossier["cached_at"] = datetime.datetime.now(datetime.timezone.utc).isoformat()
        self._dossiers_cache[article_id] = dossier
        self.save_dossiers()

    def prune_stale_dossiers(self):
        now_utc = datetime.datetime.now(datetime.timezone.utc)
        valid_cache = {}
        for aid, data in self._dossiers_cache.items():
            cached_str = data.get("cached_at")
            if cached_str:
                try:
                    c_time = datetime.datetime.fromisoformat(cached_str)
                    if (now_utc - c_time).total_seconds() < (24 * 3600):
                        valid_cache[aid] = data
                except Exception:
                    pass
        self._dossiers_cache = valid_cache
        self.save_dossiers()

store = EditionStore()
