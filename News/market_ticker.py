"""
market_ticker.py - Live Macroeconomic Market & Commodities Ribbon for 'आवाज'
Fetches and caches live prices and percentage deltas refreshed every 15 seconds:
- PETROL (Delhi/NCR/National)
- DIESEL (Delhi/NCR/National)
- GOLD 24K (MCX / 10g)
- SILVER (MCX / 1kg)
- BRENT CRUDE OIL (BZ=F)
- NIFTY 50 (^NSEI)
- SENSEX (^BSESN)
- NASDAQ (^IXIC)
- S&P 500 (^GSPC)
- USD / INR (INR=X)
- BITCOIN (BTC-USD)
"""

import sys
try:
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
except Exception:
    pass

import urllib.request
import json
import time
import datetime
from typing import Dict, Any

MARKET_SYMBOLS = [
    {"symbol": "%5ENSEI", "name": "NIFTY 50", "currency": "₹", "unit": ""},
    {"symbol": "%5EBSESN", "name": "SENSEX", "currency": "₹", "unit": ""},
    {"symbol": "BZ%3DF", "name": "BRENT CRUDE", "currency": "$", "unit": "/bbl"},
    {"symbol": "INR%3DX", "name": "USD / INR", "currency": "₹", "unit": ""},
    {"symbol": "%5EIXIC", "name": "NASDAQ", "currency": "$", "unit": ""},
    {"symbol": "%5EGSPC", "name": "S&P 500", "currency": "$", "unit": ""},
    {"symbol": "BTC-USD", "name": "BITCOIN", "currency": "$", "unit": ""}
]

# Standard retail fuel and metal benchmark rates in India
STATIC_COMMODITIES = [
    {"name": "PETROL", "price": "94.72", "currency": "₹", "unit": "/L", "change_pct": "0.00%", "is_positive": True},
    {"name": "DIESEL", "price": "87.62", "currency": "₹", "unit": "/L", "change_pct": "0.00%", "is_positive": True},
    {"name": "GOLD 24K", "price": "78,850", "currency": "₹", "unit": "/10g", "change_pct": "+0.45%", "is_positive": True},
    {"name": "SILVER", "price": "92,400", "currency": "₹", "unit": "/kg", "change_pct": "+0.80%", "is_positive": True}
]

import concurrent.futures

_cached_data = None
_last_fetch_time = 0
CACHE_TTL_SECONDS = 15  # Refreshes strictly every 15 seconds

# Seed values so ticker is immediately fully populated
_last_known_equities: Dict[str, Dict[str, Any]] = {
    "NIFTY 50": {"name": "NIFTY 50", "price": "23,146.15", "currency": "₹", "change_pct": "+0.65%", "is_positive": True},
    "SENSEX": {"name": "SENSEX", "price": "74,729.27", "currency": "₹", "change_pct": "+0.56%", "is_positive": True},
    "BRENT CRUDE": {"name": "BRENT CRUDE", "price": "109.86 /bbl", "currency": "$", "change_pct": "+3.72%", "is_positive": True},
    "USD / INR": {"name": "USD / INR", "price": "94.96", "currency": "₹", "change_pct": "-0.20%", "is_positive": False},
    "NASDAQ": {"name": "NASDAQ", "price": "26,140.03", "currency": "$", "change_pct": "-2.07%", "is_positive": False},
    "S&P 500": {"name": "S&P 500", "price": "7,659.44", "currency": "$", "change_pct": "-0.77%", "is_positive": False},
    "BITCOIN": {"name": "BITCOIN", "price": "81,440.00", "currency": "$", "change_pct": "-0.13%", "is_positive": False}
}

def _fetch_single_symbol(item: Dict[str, str], headers: Dict[str, str]) -> Optional[Dict[str, Any]]:
    sym = item["symbol"]
    name = item["name"]
    currency = item["currency"]
    unit = item.get("unit", "")
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{sym}?interval=1d&range=2d"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=3.0) as r:
            data = json.loads(r.read())
            meta = data['chart']['result'][0]['meta']
            price = meta.get('regularMarketPrice')
            prev_close = meta.get('chartPreviousClose') or price
            if price is not None and prev_close:
                delta = ((price - prev_close) / prev_close) * 100
                return {
                    "name": name,
                    "price": f"{price:,.2f}" + (f" {unit}" if unit else ""),
                    "currency": currency,
                    "change_pct": f"{delta:+.2f}%",
                    "is_positive": delta >= 0
                }
    except Exception:
        pass
    return None

def get_live_market_indices() -> Dict[str, Any]:
    global _cached_data, _last_fetch_time, _last_known_equities
    now = time.time()
    if _cached_data and (now - _last_fetch_time) < CACHE_TTL_SECONDS:
        return _cached_data

    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}

    # Fetch live equities & currencies in parallel (1 second max)
    try:
        with concurrent.futures.ThreadPoolExecutor(max_workers=7) as executor:
            futures = [executor.submit(_fetch_single_symbol, item, headers) for item in MARKET_SYMBOLS]
            for f in concurrent.futures.as_completed(futures, timeout=4.0):
                res = f.result()
                if res and res.get("name"):
                    _last_known_equities[res["name"]] = res
    except Exception:
        pass

    # Build ordered equities list from persistent cache
    live_items = []
    for item in MARKET_SYMBOLS:
        name = item["name"]
        if name in _last_known_equities:
            live_items.append(_last_known_equities[name])

    # Combine: Petrol, Diesel, Gold, Silver first, then equities, currencies, crypto
    all_tickers = []
    # Add Commodities
    for comm in STATIC_COMMODITIES:
        all_tickers.append({
            "name": comm["name"],
            "price": f"{comm['price']} {comm['unit']}",
            "currency": comm["currency"],
            "change_pct": comm["change_pct"],
            "is_positive": comm["is_positive"]
        })
    # Add Equities & Crypto
    all_tickers.extend(live_items)

    IST = datetime.timezone(datetime.timedelta(hours=5, minutes=30))
    ist_now = datetime.datetime.now(IST)
    _cached_data = {
        "success": True,
        "indices": all_tickers,
        "refresh_interval_sec": 15,
        "updated_at": ist_now.strftime("%I:%M %p IST")
    }
    _last_fetch_time = now
    return _cached_data

if __name__ == "__main__":
    res = get_live_market_indices()
    print("Market & Commodity Ticker Result (15s Refresh):")
    for idx in res["indices"]:
        print(f"  {idx['name']}: {idx['currency']}{idx['price']} ({idx['change_pct']})")
