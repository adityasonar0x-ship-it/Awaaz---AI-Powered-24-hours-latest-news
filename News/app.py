"""
app.py - Main Flask Web Server for 'आवाज'
The Worldwide Business, Technology & Social Intelligence Broadsheet
Powered by Multi-Threaded Production WSGI Server (Waitress)
"""

import sys
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import os
from flask import Flask, render_template, jsonify, request
from edition_store import store
import ai_analyst
import market_ticker

app = Flask(__name__, static_folder="static", template_folder="templates")
app.config['JSON_AS_ASCII'] = False

@app.route("/")
def index():
    """Renders the main homescreen with headings-only Pinterest grid."""
    return render_template("index.html")

@app.route("/article/<article_id>")
def article_page(article_id):
    """Renders the full in-depth journalistic article on a dedicated new page."""
    edition = store.get_or_create_edition()
    all_articles = (
        edition.get("all_stories", []) +
        edition.get("india_stories", []) +
        edition.get("worldwide_stories", []) +
        edition.get("tech_stories", []) +
        edition.get("business_stories", []) +
        edition.get("social_stories", [])
    )
    article = next((a for a in all_articles if a.get("id") == article_id), None)
    
    if not article:
        return "Article not found in the current 24-hour edition.", 404

    # Check cache or generate analysis (pre-cached loads in <50ms)
    dossier = store.get_cached_dossier(article_id)
    if not dossier:
        raw_keys = store.get_raw_keys()
        dossier = ai_analyst.analyze_article_consensus(article, custom_keys=raw_keys)
        store.cache_dossier(article_id, dossier)

    return render_template("article.html", article=article, dossier=dossier, edition=edition)

@app.route("/api/edition", methods=["GET"])
def get_edition():
    """Returns today's 24-hour edition data (resets at 00:00 midnight)."""
    force = request.args.get("refresh", "false").lower() == "true"
    edition = store.get_or_create_edition(force_refresh=force)
    return jsonify({
        "success": True,
        "edition": edition
    })

@app.route("/api/markets", methods=["GET"])
def get_market_ticker():
    """Returns live 24-hour macroeconomic indices (Sensex, Nifty 50, Nasdaq, S&P 500, USD/INR, Bitcoin)."""
    data = market_ticker.get_live_market_indices()
    return jsonify(data)

@app.route("/api/search", methods=["GET"])
def search_articles():
    """Full-scope search across all 200+ verified 24-hour stories in backend database."""
    query = request.args.get("q", "").strip().lower()
    if not query:
        return jsonify({"success": True, "count": 0, "results": []})

    edition = store.get_or_create_edition()
    all_stories = edition.get("all_stories", [])
    matches = []
    for s in all_stories:
        haystack = f"{s.get('title', '')} {s.get('summary', '')} {s.get('source', '')} {s.get('category', '')} {s.get('region', '')}".lower()
        if query in haystack:
            matches.append(s)

    return jsonify({
        "success": True,
        "count": len(matches),
        "results": matches
    })

@app.route("/api/analyze/<article_id>", methods=["POST"])
def analyze_article_endpoint(article_id):
    """API endpoint returning in-depth journalistic analysis."""
    edition = store.get_or_create_edition()
    all_articles = (
        edition.get("all_stories", []) +
        edition.get("india_stories", []) +
        edition.get("worldwide_stories", []) +
        edition.get("tech_stories", []) +
        edition.get("business_stories", []) +
        edition.get("social_stories", [])
    )
    article = next((a for a in all_articles if a.get("id") == article_id), None)
    
    if not article:
        return jsonify({
            "success": False,
            "error": "Article not found."
        }), 404

    cached = store.get_cached_dossier(article_id)
    if cached:
        return jsonify({
            "success": True,
            "cached": True,
            "article": article,
            "dossier": cached
        })

    raw_keys = store.get_raw_keys()
    dossier = ai_analyst.analyze_article_consensus(article, custom_keys=raw_keys)
    store.cache_dossier(article_id, dossier)

    return jsonify({
        "success": True,
        "cached": False,
        "article": article,
        "dossier": dossier
    })

@app.route("/api/settings", methods=["GET"])
def get_settings():
    return jsonify({
        "success": True,
        "settings": store.get_config()
    })

@app.route("/api/settings", methods=["POST"])
def update_settings():
    data = request.get_json(silent=True) or {}
    new_cfg = {}
    if "gemini_key" in data:
        new_cfg["gemini_key"] = data["gemini_key"].strip()
    if "groq_key" in data:
        new_cfg["groq_key"] = data["groq_key"].strip()
    if "third_key" in data:
        new_cfg["third_key"] = data["third_key"].strip()
        
    store.save_config(new_cfg)
    return jsonify({
        "success": True,
        "message": "AI keys successfully updated.",
        "settings": store.get_config()
    })

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))

    try:
        from waitress import serve
        print(f"आवाज starting on Multi-Threaded Production Waitress WSGI Server (port {port}, 8 threads)...")
        serve(app, host="0.0.0.0", port=port, threads=8)
    except Exception as e:
        print(f"Starting Flask dev server (fallback): {e}")
        app.run(host="0.0.0.0", port=port, debug=False)
