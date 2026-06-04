# -*- coding: utf-8 -*-
"""
==========================================================================
FULL MARKET OI SCREENER + DATA SYNC (sync_data.py v4.0)
==========================================================================
Phase 1 - Market-wide OI Screen:
  For every major Chinese futures commodity across SHFE/DCE/CZCE/INE/GFEX,
  pull 10-year continuous main-contract history via futures_main_sina,
  compute historical peak OI and compare against today.
  Flag conditions:
    (a) near_high  : current_oi >= peak_oi * 0.90
    (b) new_high   : current_oi >  peak_oi  (all-time high)

Phase 2 - Detail Fetch (watchlist + anomaly contracts):
  For the 6 fixed watchlist contracts AND all anomaly contracts,
  identify the actual main contract month (highest position), and
  download 120-day daily K-line + 40-bar 15-min intraday data.

Output  : data/futures_data.json
Requires: pip install akshare pandas
"""

import os, json, sys, datetime

# ─────────────────────────────────────────────────────────────────────────────
# COMPLETE COMMODITY CONFIG (all 5 Chinese exchanges)
# ─────────────────────────────────────────────────────────────────────────────
ALL_CFG = {
    # ── SHFE 上期所 ──────────────────────────────────
    'AU': {'name':'沪金',    'realtime':'黄金',     'exch':'SHFE', 'mult':1000,'margin':0.08,'unit':'克'},
    'AG': {'name':'沪银',    'realtime':'白银',     'exch':'SHFE', 'mult':15,  'margin':0.08,'unit':'千克'},
    'CU': {'name':'沪铜',    'realtime':'沪铜',     'exch':'SHFE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'AL': {'name':'沪铝',    'realtime':'沪铝',     'exch':'SHFE', 'mult':5,   'margin':0.09,'unit':'吨'},
    'ZN': {'name':'沪锌',    'realtime':'沪锌',     'exch':'SHFE', 'mult':5,   'margin':0.09,'unit':'吨'},
    'PB': {'name':'沪铅',    'realtime':'沪铅',     'exch':'SHFE', 'mult':5,   'margin':0.09,'unit':'吨'},
    'NI': {'name':'沪镍',    'realtime':'沪镍',     'exch':'SHFE', 'mult':1,   'margin':0.10,'unit':'吨'},
    'SN': {'name':'沪锡',    'realtime':'沪锡',     'exch':'SHFE', 'mult':1,   'margin':0.10,'unit':'吨'},
    'RB': {'name':'螺纹钢',  'realtime':'螺纹钢',   'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'HC': {'name':'热轧板',  'realtime':'热轧卷板', 'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'SS': {'name':'不锈钢',  'realtime':'不锈钢',   'exch':'SHFE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'FU': {'name':'燃油',    'realtime':'燃油',     'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'BU': {'name':'沥青',    'realtime':'沥青',     'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'RU': {'name':'橡胶',    'realtime':'天然橡胶', 'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'SP': {'name':'纸浆',    'realtime':'纸浆',     'exch':'SHFE', 'mult':10,  'margin':0.10,'unit':'吨'},
    'EB': {'name':'苯乙烯',  'realtime':'苯乙烯',   'exch':'SHFE', 'mult':5,   'margin':0.09,'unit':'吨'},
    'BR': {'name':'合成橡胶','realtime':'丁二烯橡胶','exch':'SHFE','mult':5,   'margin':0.10,'unit':'吨'},
    'AO': {'name':'氧化铝',  'realtime':'氧化铝',   'exch':'SHFE','mult':20,  'margin':0.09,'unit':'吨'},
    # ── DCE 大商所 ──────────────────────────────────
    'I':  {'name':'铁矿石',  'realtime':'铁矿石',   'exch':'DCE',  'mult':100, 'margin':0.09,'unit':'吨'},
    'JM': {'name':'焦煤',    'realtime':'焦煤',     'exch':'DCE',  'mult':60,  'margin':0.10,'unit':'吨'},
    'J':  {'name':'焦炭',    'realtime':'焦炭',     'exch':'DCE',  'mult':100, 'margin':0.10,'unit':'吨'},
    'C':  {'name':'玉米',    'realtime':'玉米',     'exch':'DCE',  'mult':10,  'margin':0.05,'unit':'吨'},
    'CS': {'name':'淀粉',    'realtime':'淀粉',     'exch':'DCE',  'mult':10,  'margin':0.05,'unit':'吨'},
    'A':  {'name':'豆一',    'realtime':'大豆一号', 'exch':'DCE',  'mult':10,  'margin':0.05,'unit':'吨'},
    'M':  {'name':'豆粕',    'realtime':'豆粕',     'exch':'DCE',  'mult':10,  'margin':0.06,'unit':'吨'},
    'Y':  {'name':'豆油',    'realtime':'豆油',     'exch':'DCE',  'mult':10,  'margin':0.07,'unit':'吨'},
    'P':  {'name':'棕榈油',  'realtime':'棕榈油',   'exch':'DCE',  'mult':10,  'margin':0.07,'unit':'吨'},
    'V':  {'name':'PVC',     'realtime':'PVC',      'exch':'DCE',  'mult':5,   'margin':0.08,'unit':'吨'},
    'L':  {'name':'聚乙烯',  'realtime':'聚乙烯',   'exch':'DCE',  'mult':5,   'margin':0.08,'unit':'吨'},
    'PP': {'name':'聚丙烯',  'realtime':'聚丙烯',   'exch':'DCE',  'mult':5,   'margin':0.08,'unit':'吨'},
    'EG': {'name':'乙二醇',  'realtime':'乙二醇',   'exch':'DCE',  'mult':10,  'margin':0.09,'unit':'吨'},
    'PG': {'name':'液化气',  'realtime':'液化石油气','exch':'DCE', 'mult':20,  'margin':0.08,'unit':'吨'},
    'JD': {'name':'鸡蛋',    'realtime':'鸡蛋',     'exch':'DCE',  'mult':10,  'margin':0.08,'unit':'500kg'},
    'LH': {'name':'生猪',    'realtime':'生猪',     'exch':'DCE',  'mult':16,  'margin':0.15,'unit':'吨'},
    'RR': {'name':'粳木',    'realtime':'粳木',     'exch':'DCE',  'mult':10,  'margin':0.10,'unit':'吨'},
    'B':  {'name':'豆二',    'realtime':'黄大豆二号','exch':'DCE',  'mult':10,  'margin':0.06,'unit':'吨'},
    # ── CZCE 郑商所 ──────────────────────────────────
    'SR': {'name':'白糖',    'realtime':'白糖',     'exch':'CZCE', 'mult':10,  'margin':0.07,'unit':'吨'},
    'CF': {'name':'棉花',    'realtime':'棉花',     'exch':'CZCE', 'mult':5,   'margin':0.07,'unit':'吨'},
    'TA': {'name':'PTA',     'realtime':'PTA',      'exch':'CZCE', 'mult':5,   'margin':0.08,'unit':'吨'},
    'MA': {'name':'甲醇',    'realtime':'甲醇',     'exch':'CZCE', 'mult':10,  'margin':0.08,'unit':'吨'},
    'FG': {'name':'玻璃',    'realtime':'玻璃',     'exch':'CZCE', 'mult':20,  'margin':0.08,'unit':'吨'},
    'OI': {'name':'菜油',    'realtime':'菜籽油',   'exch':'CZCE', 'mult':10,  'margin':0.07,'unit':'吨'},
    'RM': {'name':'菜粕',    'realtime':'菜粕',     'exch':'CZCE', 'mult':10,  'margin':0.07,'unit':'吨'},
    'SA': {'name':'纯碱',    'realtime':'纯碱',     'exch':'CZCE', 'mult':20,  'margin':0.09,'unit':'吨'},
    'ZC': {'name':'动力煤',  'realtime':'动力煤',   'exch':'CZCE', 'mult':100, 'margin':0.10,'unit':'吨'},
    'UR': {'name':'尿素',    'realtime':'尿素',     'exch':'CZCE', 'mult':20,  'margin':0.08,'unit':'吨'},
    'AP': {'name':'苹果',    'realtime':'苹果',     'exch':'CZCE', 'mult':10,  'margin':0.10,'unit':'吨'},
    'CJ': {'name':'红枣',    'realtime':'红枣',     'exch':'CZCE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'PK': {'name':'花生',    'realtime':'花生',     'exch':'CZCE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'SF': {'name':'硅铁',    'realtime':'硅铁',     'exch':'CZCE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'SM': {'name':'锰硅',    'realtime':'锰硅',     'exch':'CZCE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'PX': {'name':'对二甲苯','realtime':'对二甲苯', 'exch':'CZCE','mult':5,   'margin':0.08,'unit':'吨'},
    'SH': {'name':'烧碱',    'realtime':'烧碱',     'exch':'CZCE','mult':30,  'margin':0.09,'unit':'吨'},
    'PR': {'name':'瓶片',    'realtime':'瓶片',     'exch':'CZCE','mult':15,  'margin':0.08,'unit':'吨'},
    # ── INE 上期能源 ──────────────────────────────────
    'SC': {'name':'原油',    'realtime':'原油',     'exch':'INE',  'mult':1000,'margin':0.11,'unit':'桶'},
    'LU': {'name':'低硫油',  'realtime':'低硫燃料油','exch':'INE', 'mult':10,  'margin':0.10,'unit':'吨'},
    'NR': {'name':'20号胶',  'realtime':'20号胶',   'exch':'INE',  'mult':10,  'margin':0.10,'unit':'吨'},
    'BC': {'name':'国际铜',  'realtime':'国际铜',   'exch':'INE',  'mult':5,   'margin':0.10,'unit':'吨'},
    'EC': {'name':'欧线集运','realtime':'集运指数', 'exch':'INE',  'mult':50,  'margin':0.15,'unit':'点'},
    # ── GFEX 广期所 ──────────────────────────────────
    'SI': {'name':'工业硅',  'realtime':'工业硅',   'exch':'GFEX', 'mult':5,   'margin':0.12,'unit':'吨'},
    'LC': {'name':'碳酸锂',  'realtime':'碳酸锂',   'exch':'GFEX', 'mult':1,   'margin':0.12,'unit':'吨'},
}

# Fixed watchlist: always show K-line detail regardless of OI alert status
WATCHLIST = ['AU', 'CU', 'RB', 'SC', 'SR', 'TA']

# Historical column order from futures_main_sina
HIST_COLS = ['date', 'open', 'high', 'low', 'close', 'volume', 'hold', 'ext']

# OI near-high threshold
NEAR_HIGH_THRESH = 0.90
HISTORY_YEARS = 10


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def screen_commodity(ak, pd, code, start_date):
    """
    Pull 10-year continuous main-contract history and compute OI significance.
    Returns a dict of screening results, or None on failure.
    """
    cfg = ALL_CFG[code]
    sym = f"{code}0"
    try:
        df = ak.futures_main_sina(symbol=sym, start_date=start_date)
        if df is None or df.empty:
            return None
        df.columns = HIST_COLS[:len(df.columns)]
        df['hold'] = pd.to_numeric(df['hold'], errors='coerce').fillna(0)
        df_nz = df[df['hold'] > 0]
        if df_nz.empty:
            return None

        if len(df_nz) > 1:
            past_df = df_nz.iloc[:-1]
            hist_max_oi_past = int(past_df['hold'].max())
            hist_max_date = str(past_df.loc[past_df['hold'].idxmax(), 'date'])
        else:
            hist_max_oi_past = 0
            hist_max_date = ''
            
        curr_oi       = int(df.iloc[-1]['hold'])
        data_start    = str(df['date'].min())
        data_rows     = len(df)
        
        data_start_dt = pd.to_datetime(data_start)
        last_date_dt  = pd.to_datetime(str(df.iloc[-1]['date']))
        years_history = (last_date_dt - data_start_dt).days / 365.25

        ratio = curr_oi / hist_max_oi_past if hist_max_oi_past > 0 else 0
        
        alert = 'normal'
        if years_history >= 1.0:
            if curr_oi > hist_max_oi_past and hist_max_oi_past > 0:
                alert = 'new_high'
            elif years_history >= 3.0 and hist_max_oi_past > 0 and ratio >= NEAR_HIGH_THRESH:
                alert = 'near_high'
                
        # For display
        display_hist_max = max(hist_max_oi_past, curr_oi)
        display_hist_date = str(df.loc[df['hold'].idxmax(), 'date'])

        return {
            'code':            code,
            'name':            cfg['name'],
            'exchange':        cfg['exch'],
            'currentOI':       curr_oi,
            'historicalMaxOI': display_hist_max,
            'historicalMaxDate': display_hist_date,
            'dataStart':       data_start,
            'dataRows':        data_rows,
            'oiRatio':         round(ratio, 4),
            'alert':           alert,
        }
    except Exception as e:
        return None


def find_main_contract(ak, pd, code, realtime_name):
    """
    Query futures_zh_realtime to find the contract with highest open interest.
    Returns (contract_symbol, oi, price) or (None, 0, 0).
    """
    try:
        df = ak.futures_zh_realtime(symbol=realtime_name)
        if df is None or df.empty:
            return None, 0, 0.0
        df_real = df[~df['symbol'].str.endswith('0')].copy()
        df_real = df_real[df_real['symbol'].str.contains(r'\d', regex=True)]
        if df_real.empty:
            return None, 0, 0.0
        df_real['position'] = pd.to_numeric(df_real['position'], errors='coerce').fillna(0)
        row = df_real.loc[df_real['position'].idxmax()]
        sym   = str(row['symbol']).upper()
        oi    = int(row['position'])
        price = float(row.get('trade', row.get('close', 0)))
        if sym.startswith(code.upper()) and oi > 0:
            return sym, oi, price
    except Exception:
        pass
    return None, 0, 0.0


def fetch_daily(ak, pd, symbol, n=120):
    """Fetch n-day daily K-line bars."""
    df = ak.futures_zh_daily_sina(symbol=symbol)
    if df is None or df.empty:
        raise ValueError(f"Empty daily data: {symbol}")
    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').tail(n)
    out = []
    for _, row in df.iterrows():
        out.append({
            'date':   row['date'].strftime('%Y-%m-%d'),
            'open':   float(row['open']),
            'high':   float(row['high']),
            'low':    float(row['low']),
            'close':  float(row['close']),
            'volume': int(row['volume']),
            'hold':   int(row['hold']) if ('hold' in row.index and not pd.isna(row['hold'])) else 0,
        })
    return out


def fetch_minute(ak, pd, symbol, period='15', n=40):
    """Fetch 15-min intraday K-line bars."""
    try:
        df = ak.futures_zh_minute_sina(symbol=symbol, period=period)
        if df is None or df.empty:
            return []
        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('datetime').tail(n)
        out = []
        for _, row in df.iterrows():
            out.append({
                'datetime': row['datetime'].strftime('%Y-%m-%d %H:%M:%S'),
                'open':  float(row['open']),
                'high':  float(row['high']),
                'low':   float(row['low']),
                'close': float(row['close']),
                'volume':int(row['volume']),
            })
        return out
    except Exception:
        return []


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def sync_futures():
    print("=" * 70)
    print("  Moxi Investment | Full Market OI Screener + Sync  v4.0")
    print("  Coverage: SHFE / DCE / CZCE / INE / GFEX  (~50 contracts)")
    print("=" * 70)

    try:
        import akshare as ak
        import pandas as pd
    except ImportError:
        print("[-] pip install akshare pandas")
        return False

    now_str    = datetime.datetime.now().isoformat()
    start_date = (datetime.datetime.now() - datetime.timedelta(days=HISTORY_YEARS * 365)).strftime('%Y%m%d')
    total = len(ALL_CFG)

    # ──────────────────────────────────────────────────────────
    # PHASE 1: OI SCREEN — all commodities
    # ──────────────────────────────────────────────────────────
    print(f"\n[Phase 1] OI screening {total} commodities since {start_date[:4]}...\n")
    screening  = {}  # code -> screening result dict
    anomalies  = []  # codes meeting near_high or new_high

    for idx, (code, cfg) in enumerate(ALL_CFG.items(), 1):
        result = screen_commodity(ak, pd, code, start_date)
        if result:
            screening[code] = result
            if result['alert'] in ('near_high', 'new_high'):
                anomalies.append(code)
            badge = f"[{result['alert'].upper()}]" if result['alert'] != 'normal' else ''
            print(f"  [{idx:>2}/{total}] {code:<4} {cfg['name']:<8} "
                  f"curr={result['currentOI']:>8,}  "
                  f"peak={result['historicalMaxOI']:>8,}  "
                  f"ratio={result['oiRatio']:>6.1%}  {badge}")
        else:
            print(f"  [{idx:>2}/{total}] {code:<4} {cfg['name']:<8} -- SKIP (no data)")

    print(f"\n  Screen done. Anomalies: {len(anomalies)} -> {anomalies if anomalies else 'none'}")

    # ──────────────────────────────────────────────────────────
    # PHASE 2: DETAIL FETCH — watchlist + anomalies
    # ──────────────────────────────────────────────────────────
    detail_codes = sorted(set(WATCHLIST + anomalies), key=lambda c: (c not in anomalies, c))
    print(f"\n[Phase 2] Fetching K-line detail for {len(detail_codes)} contracts: {detail_codes}\n")

    contracts_meta = {}
    data_out       = {}

    for code in detail_codes:
        cfg = ALL_CFG[code]
        print(f"  [+] {cfg['name']} ({code}) @ {cfg['exch']}")

        # Find actual main contract month
        main_sym, main_oi, main_price = find_main_contract(ak, pd, code, cfg['realtime'])
        if main_sym:
            kline_sym   = main_sym
            display_sym = main_sym
            print(f"      Main: {main_sym}  OI={main_oi:,}  price={main_price}")
        else:
            kline_sym   = f"{code}0"
            display_sym = f"{code}(主力)"
            screen_curr = screening.get(code, {}).get('currentOI', 0)
            main_oi     = screen_curr
            main_price  = 0.0

        # Daily K-line
        try:
            daily = fetch_daily(ak, pd, kline_sym)
            print(f"      Daily: {len(daily)} bars")
        except Exception as e:
            print(f"      Daily FAILED ({e}), fallback to {code}0")
            try:
                kline_sym = f"{code}0"
                daily = fetch_daily(ak, pd, kline_sym)
                print(f"      Daily (fallback): {len(daily)} bars")
            except Exception:
                daily = []

        # 15-min intraday
        min15 = fetch_minute(ak, pd, kline_sym)
        print(f"      15-min: {len(min15)} bars")

        # Build metadata
        oi_screen = screening.get(code, {})
        contracts_meta[code] = {
            'symbol':      display_sym,
            'klineSource': kline_sym,
            'name':        f"{cfg['name']}主力",
            'exchange':    cfg['exch'],
            'multiplier':  cfg['mult'],
            'marginRate':  cfg['margin'],
            'unit':        cfg['unit'],
            'openInterest':main_oi,
            'latestPrice': main_price,
            'isWatchlist': code in WATCHLIST,
            'isAnomaly':   code in anomalies,
            'oiAnalysis': {
                'currentOI':        oi_screen.get('currentOI', main_oi),
                'historicalMaxOI':  oi_screen.get('historicalMaxOI', 0),
                'historicalMaxDate':oi_screen.get('historicalMaxDate', ''),
                'dataStart':        oi_screen.get('dataStart', ''),
                'oiRatio':          oi_screen.get('oiRatio', 0),
                'alert':            oi_screen.get('alert', 'unknown'),
            },
        }

        data_out[code] = {'daily': daily, 'min15': min15}

    # ──────────────────────────────────────────────────────────
    # OUTPUT JSON
    # ──────────────────────────────────────────────────────────
    output = {
        'metadata': {
            'sync_time':      now_str,
            'version':        '4.0',
            'description':    'Full market OI screen | watchlist + anomaly K-line data',
            'historyYears':   HISTORY_YEARS,
            'nearHighThresh': NEAR_HIGH_THRESH,
            'watchlist':      WATCHLIST,
            'anomalies':      anomalies,
            'screening':      screening,    # OI stats for ALL screened commodities
            'contracts':      contracts_meta,
        },
        **data_out,
    }

    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    os.makedirs(data_dir, exist_ok=True)
    out_path = os.path.join(data_dir, 'futures_data.json')

    try:
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        print("\n" + "=" * 70)
        print("[OK] Sync complete!")
        print(f"     Screened : {len(screening)} commodities")
        print(f"     Anomalies: {len(anomalies)} -> {anomalies if anomalies else 'none today'}")
        print(f"     Detail   : {len(data_out)} contracts with K-line data")
        print(f"     Output   : {out_path}")
        print("=" * 70)
        return True
    except Exception as e:
        print(f"[-] Write failed: {e}")
        return False


if __name__ == '__main__':
    sys.exit(0 if sync_futures() else 1)
