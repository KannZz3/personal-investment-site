# -*- coding: utf-8 -*-
"""
==========================================================================
FULL MARKET OI SCREENER + DATA SYNC (sync_data.py v6.1 - TqSdk Only Optimized)
==========================================================================
Output  : data/futures_data.json
Requires: pip install pandas tqsdk
"""

import os, json, sys, datetime, math, time
import pandas as pd
from tqsdk import TqApi, TqAuth

# ─────────────────────────────────────────────────────────────────────────────
# COMPLETE COMMODITY CONFIG (all 5 Chinese exchanges)
# ─────────────────────────────────────────────────────────────────────────────
ALL_CFG = {
    # ── SHFE 上期所 ──────────────────────────────────
    'AU': {'name':'沪金',    'exch':'SHFE', 'mult':1000,'margin':0.08,'unit':'克'},
    'AG': {'name':'沪银',    'exch':'SHFE', 'mult':15,  'margin':0.08,'unit':'千克'},
    'CU': {'name':'沪铜',    'exch':'SHFE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'AL': {'name':'沪铝',    'exch':'SHFE', 'mult':5,   'margin':0.09,'unit':'吨'},
    'ZN': {'name':'沪锌',    'exch':'SHFE', 'mult':5,   'margin':0.09,'unit':'吨'},
    'PB': {'name':'沪铅',    'exch':'SHFE', 'mult':5,   'margin':0.09,'unit':'吨'},
    'NI': {'name':'沪镍',    'exch':'SHFE', 'mult':1,   'margin':0.10,'unit':'吨'},
    'SN': {'name':'沪锡',    'exch':'SHFE', 'mult':1,   'margin':0.10,'unit':'吨'},
    'RB': {'name':'螺纹钢',  'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'HC': {'name':'热轧板',  'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'SS': {'name':'不锈钢',  'exch':'SHFE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'FU': {'name':'燃油',    'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'BU': {'name':'沥青',    'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'RU': {'name':'橡胶',    'exch':'SHFE', 'mult':10,  'margin':0.09,'unit':'吨'},
    'SP': {'name':'纸浆',    'exch':'SHFE', 'mult':10,  'margin':0.10,'unit':'吨'},
    'EB': {'name':'苯乙烯',  'exch':'DCE',  'mult':5,   'margin':0.09,'unit':'吨'},
    'BR': {'name':'合成橡胶','exch':'SHFE','mult':5,   'margin':0.10,'unit':'吨'},
    'AO': {'name':'氧化铝',  'exch':'SHFE','mult':20,  'margin':0.09,'unit':'吨'},
    # ── DCE 大商所 ──────────────────────────────────
    'I':  {'name':'铁矿石',  'exch':'DCE',  'mult':100, 'margin':0.09,'unit':'吨'},
    'JM': {'name':'焦煤',    'exch':'DCE',  'mult':60,  'margin':0.10,'unit':'吨'},
    'J':  {'name':'焦炭',    'exch':'DCE',  'mult':100, 'margin':0.10,'unit':'吨'},
    'C':  {'name':'玉米',    'exch':'DCE',  'mult':10,  'margin':0.05,'unit':'吨'},
    'CS': {'name':'淀粉',    'exch':'DCE',  'mult':10,  'margin':0.05,'unit':'吨'},
    'A':  {'name':'豆一',    'exch':'DCE',  'mult':10,  'margin':0.05,'unit':'吨'},
    'M':  {'name':'豆粕',    'exch':'DCE',  'mult':10,  'margin':0.06,'unit':'吨'},
    'Y':  {'name':'豆油',    'exch':'DCE',  'mult':10,  'margin':0.07,'unit':'吨'},
    'P':  {'name':'棕榈油',  'exch':'DCE',  'mult':10,  'margin':0.07,'unit':'吨'},
    'V':  {'name':'PVC',     'exch':'DCE',  'mult':5,   'margin':0.08,'unit':'吨'},
    'L':  {'name':'聚乙烯',  'exch':'DCE',  'mult':5,   'margin':0.08,'unit':'吨'},
    'PP': {'name':'聚丙烯',  'exch':'DCE',  'mult':5,   'margin':0.08,'unit':'吨'},
    'EG': {'name':'乙二醇',  'exch':'DCE',  'mult':10,  'margin':0.09,'unit':'吨'},
    'PG': {'name':'液化气',  'exch':'DCE',  'mult':20,  'margin':0.08,'unit':'吨'},
    'JD': {'name':'鸡蛋',    'exch':'DCE',  'mult':10,  'margin':0.08,'unit':'500kg'},
    'LH': {'name':'生猪',    'exch':'DCE',  'mult':16,  'margin':0.15,'unit':'吨'},
    'RR': {'name':'粳米',    'exch':'DCE',  'mult':10,  'margin':0.10,'unit':'吨'},
    'B':  {'name':'豆二',    'exch':'DCE',  'mult':10,  'margin':0.06,'unit':'吨'},
    'FB': {'name':'纤维板',  'exch':'DCE',  'mult':10,  'margin':0.10,'unit':'立方米'},
    # ── CZCE 郑商所 ──────────────────────────────────
    'SR': {'name':'白糖',    'exch':'CZCE', 'mult':10,  'margin':0.07,'unit':'吨'},
    'CF': {'name':'棉花',    'exch':'CZCE', 'mult':5,   'margin':0.07,'unit':'吨'},
    'TA': {'name':'PTA',     'exch':'CZCE', 'mult':5,   'margin':0.08,'unit':'吨'},
    'MA': {'name':'甲醇',    'exch':'CZCE', 'mult':10,  'margin':0.08,'unit':'吨'},
    'FG': {'name':'玻璃',    'exch':'CZCE', 'mult':20,  'margin':0.08,'unit':'吨'},
    'OI': {'name':'菜油',    'exch':'CZCE', 'mult':10,  'margin':0.07,'unit':'吨'},
    'RM': {'name':'菜粕',    'exch':'CZCE', 'mult':10,  'margin':0.07,'unit':'吨'},
    'SA': {'name':'纯碱',    'exch':'CZCE', 'mult':20,  'margin':0.09,'unit':'吨'},
    'ZC': {'name':'动力煤',  'exch':'CZCE', 'mult':100, 'margin':0.10,'unit':'吨'},
    'UR': {'name':'尿素',    'exch':'CZCE', 'mult':20,  'margin':0.08,'unit':'吨'},
    'AP': {'name':'苹果',    'exch':'CZCE', 'mult':10,  'margin':0.10,'unit':'吨'},
    'CJ': {'name':'红枣',    'exch':'CZCE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'PK': {'name':'花生',    'exch':'CZCE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'SF': {'name':'硅铁',    'exch':'CZCE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'SM': {'name':'锰硅',    'exch':'CZCE', 'mult':5,   'margin':0.10,'unit':'吨'},
    'PX': {'name':'对二甲苯','exch':'CZCE','mult':5,   'margin':0.08,'unit':'吨'},
    'SH': {'name':'烧碱',    'exch':'CZCE','mult':30,  'margin':0.09,'unit':'吨'},
    'PR': {'name':'瓶片',    'exch':'CZCE','mult':15,  'margin':0.08,'unit':'吨'},
    'RS': {'name':'油菜籽',  'exch':'CZCE','mult':10,  'margin':0.10,'unit':'吨'},
    'WH': {'name':'强麦',    'exch':'CZCE','mult':20,  'margin':0.10,'unit':'吨'},
    'JR': {'name':'粳稻',    'exch':'CZCE','mult':20,  'margin':0.10,'unit':'吨'},
    'RI': {'name':'早籼稻',  'exch':'CZCE','mult':20,  'margin':0.10,'unit':'吨'},
    'LR': {'name':'晚籼稻',  'exch':'CZCE','mult':20,  'margin':0.10,'unit':'吨'},
    'CY': {'name':'棉纱',    'exch':'CZCE','mult':5,   'margin':0.10,'unit':'吨'},
    'PF': {'name':'短纤',    'exch':'CZCE','mult':5,   'margin':0.10,'unit':'吨'},
    # ── INE 上期能源 ──────────────────────────────────
    'SC': {'name':'原油',    'exch':'INE',  'mult':1000,'margin':0.11,'unit':'桶'},
    'LU': {'name':'低硫油',  'exch':'INE', 'mult':10,  'margin':0.10,'unit':'吨'},
    'NR': {'name':'20号胶',  'exch':'INE',  'mult':10,  'margin':0.10,'unit':'吨'},
    'BC': {'name':'国际铜',  'exch':'INE',  'mult':5,   'margin':0.10,'unit':'吨'},
    'EC': {'name':'欧线集运','exch':'INE',  'mult':50,  'margin':0.15,'unit':'点'},
    # ── GFEX 广期所 ──────────────────────────────────
    'SI': {'name':'工业硅',  'exch':'GFEX', 'mult':5,   'margin':0.12,'unit':'吨'},
    'LC': {'name':'碳酸锂',  'exch':'GFEX', 'mult':1,   'margin':0.12,'unit':'吨'},
}

NEAR_HIGH_THRESH = 0.90
HISTORY_YEARS = 10

def finite_float(value, default=0.0):
    """Convert numeric values while preventing NaN/Infinity from reaching JSON."""
    try:
        num = float(value)
        return num if math.isfinite(num) else default
    except Exception:
        return default

def normalize_contract_code(symbol):
    """Normalize exchange-prefixed symbols such as SHFE.sp2609 to SP2609."""
    if not symbol:
        return ''
    text = str(symbol).strip()
    if '.' in text:
        parts = text.split('.')
        symbol_part = parts[1].upper() if len(parts) == 2 else text
        return symbol_part
    return text.upper()

def load_tq_credentials():
    """Load TqSdk credentials from env first, then local private config files."""
    username = os.environ.get('TQ_USERNAME')
    password = os.environ.get('TQ_PASSWORD')

    if str(username or '').strip() and str(password or '').strip():
        return username, password

    user_profile = os.environ.get('USERPROFILE', 'C:\\Users\\78432')
    config_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'config.json'),
        os.path.abspath(os.path.join(user_profile, 'Desktop', 'config.json')),
        os.path.abspath(os.path.join(user_profile, 'OneDrive', 'Desktop', 'config.json')),
        os.path.abspath(os.path.join(user_profile, 'OneDrive', '桌面', 'config.json')),
    ]
    for path in config_paths:
        if not os.path.exists(path):
            continue
        try:
            with open(path, 'r', encoding='utf-8') as f:
                cfg_data = json.load(f)
            username = cfg_data.get('tq_username')
            password = cfg_data.get('tq_password')
            if str(username or '').strip() and str(password or '').strip():
                print(f"[+] Loaded TqSdk credentials from {path}")
                return username, password
        except Exception as e:
            print(f"[-] Error reading {path}: {e}")

    return None, None

def resolve_tq_margin_info(code, margin_lookup, preferred_contract=None):
    """Resolve TqSdk per-lot margin metadata."""
    normalized = normalize_contract_code(preferred_contract)
    info = margin_lookup.get('by_contract', {}).get(normalized) if normalized else None
    if info is None:
        info = margin_lookup.get('by_code', {}).get(code.upper())
    if info is not None:
        return {
            'contractCode': info.get('contractCode', ''),
            'marginPerLot': info.get('marginPerLot'),
            'marginPerLotLong': info.get('marginPerLotLong'),
            'marginPerLotShort': info.get('marginPerLotShort'),
            'marginRateSource': margin_lookup.get('source', 'tqsdk'),
            'marginRateAsOf': margin_lookup.get('asOf', ''),
        }
    return {
        'contractCode': normalized if normalized else f"{code.upper()}(主力)",
        'marginPerLot': None,
        'marginPerLotLong': None,
        'marginPerLotShort': None,
        'marginRateSource': 'none',
        'marginRateAsOf': '',
    }

def build_margin_info_from_tq_quote(code, quote, now_str):
    """Build per-lot margin metadata from TqSdk quote.margin."""
    margin_per_lot = finite_float(getattr(quote, 'margin', 0), 0.0)
    if margin_per_lot <= 0:
        return None
    return {
        'contractCode': normalize_contract_code(quote.instrument_id),
        'marginPerLot': margin_per_lot,
        'marginPerLotLong': margin_per_lot,
        'marginPerLotShort': margin_per_lot,
    }

def fetch_tq_margin_lookup(api, time_mod, now_str, attempts=3):
    """Fetch per-lot margin for all current main contracts via TqSdk."""
    lookup = {'by_code': {}, 'by_contract': {}, 'source': 'tqsdk.quote.margin', 'asOf': now_str}
    pending = set(ALL_CFG.keys())

    quotes = {}
    for code in pending:
        sym = get_tq_main_symbol(code, ALL_CFG[code]['exch'])
        quotes[code] = api.get_quote(sym)

    # Smart wait loop: break immediately when all continuous main symbols resolve
    start_time = time_mod.time()
    while time_mod.time() - start_time < 5.0:
        if all(getattr(quotes[code], 'underlying_symbol', None) for code in pending):
            break
        api.wait_update(deadline=time_mod.time() + 0.2)

    specific_quotes = {}
    resolved_codes = {}
    for code in list(pending):
        q = quotes[code]
        specific_sym = getattr(q, 'underlying_symbol', None)
        if specific_sym:
            specific_quotes[code] = api.get_quote(specific_sym)
            resolved_codes[code] = specific_sym

    # Smart wait loop: break immediately when all resolved specific contracts have margins
    start_time = time_mod.time()
    while time_mod.time() - start_time < 5.0:
        if all(getattr(specific_quotes[code], 'margin', 0) > 0 for code in resolved_codes.keys()):
            break
        api.wait_update(deadline=time_mod.time() + 0.2)

    for code in ALL_CFG.keys():
        quote = specific_quotes.get(code)
        if quote:
            info = build_margin_info_from_tq_quote(code, quote, now_str)
            if info:
                lookup['by_code'][code] = info
                lookup['by_contract'][info['contractCode']] = info
    return lookup

def get_tq_main_symbol(code, exch):
    """Format the TqSdk continuous main contract symbol based on exchange rules."""
    if exch == 'CZCE':
        return f"KQ.m@CZCE.{code.upper()}"
    else:
        return f"KQ.m@{exch.upper()}.{code.lower()}"

def fetch_minute(pd, df, n=1500):
    """Format pre-loaded minute K-lines from TqSdk K-lines."""
    if df is None or df.empty:
        return []
    try:
        df = df.copy()
        df = df.dropna(subset=['datetime', 'open', 'high', 'low', 'close'])
        for col in ['open', 'high', 'low', 'close', 'volume', 'close_oi']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        df = df.dropna(subset=['open', 'high', 'low', 'close'])
        dt = pd.to_datetime(df['datetime'], unit='ns', errors='coerce')
        df = df[dt.notna()].copy()
        dt = dt[dt.notna()]
        valid_dt = dt >= pd.Timestamp('2000-01-01')
        df = df[valid_dt].copy()
        dt = dt[valid_dt]
        df['datetime_str'] = dt.dt.tz_localize('UTC').dt.tz_convert('Asia/Shanghai').dt.strftime('%Y-%m-%d %H:%M:%S')
        df['hold'] = pd.to_numeric(df['close_oi'], errors='coerce').fillna(0)
        df['volume'] = pd.to_numeric(df['volume'], errors='coerce').fillna(0)
        df = df.sort_values('datetime_str').tail(n)

        out = []
        for _, row in df.iterrows():
            out.append({
                'datetime': row['datetime_str'],
                'open':  finite_float(row['open']),
                'high':  finite_float(row['high']),
                'low':   finite_float(row['low']),
                'close': finite_float(row['close']),
                'volume':int(row['volume']),
                'hold':  int(row['hold']),
            })
        return out
    except Exception as e:
        print(f"Error parsing minute: {e}")
        return []

def fetch_daily_tq(pd, df, start_date_str):
    """Format daily K-line DataFrame from TqSdk K-lines."""
    if df is None or df.empty:
        return []
    try:
        df = df.copy()
        df = df.dropna(subset=['datetime', 'open', 'high', 'low', 'close'])
        for col in ['open', 'high', 'low', 'close', 'volume', 'close_oi']:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors='coerce')
        df = df.dropna(subset=['open', 'high', 'low', 'close'])
        dt = pd.to_datetime(df['datetime'], unit='ns', errors='coerce')
        df = df[dt.notna()].copy()
        dt = dt[dt.notna()]
        valid_dt = dt >= pd.Timestamp('2000-01-01')
        df = df[valid_dt].copy()
        dt = dt[valid_dt]
        df['date_str'] = dt.dt.tz_localize('UTC').dt.tz_convert('Asia/Shanghai').dt.strftime('%Y-%m-%d')
        df['hold'] = pd.to_numeric(df['close_oi'], errors='coerce').fillna(0)
        df['volume'] = pd.to_numeric(df['volume'], errors='coerce').fillna(0)
        df = df.sort_values('date_str')
        
        df = df[df['date_str'] >= start_date_str]

        out = []
        for _, row in df.iterrows():
            out.append({
                'date':   row['date_str'],
                'open':   finite_float(row['open']),
                'high':   finite_float(row['high']),
                'low':    finite_float(row['low']),
                'close':  finite_float(row['close']),
                'volume': int(row['volume']),
                'hold':   int(row['hold']),
            })
        return out
    except Exception as e:
        print(f"Error parsing daily: {e}")
        return []

def screen_commodity_tq(code, df, start_date_str):
    """
    Compute OI significance on preloaded TqSdk daily K-line DataFrame.
    """
    cfg = ALL_CFG[code]
    try:
        if df is None or df.empty:
            return None
        
        df_nz = df.copy()
        df_nz = df_nz.dropna(subset=['datetime', 'open', 'high', 'low', 'close'])
        df_nz['hold'] = pd.to_numeric(df_nz['close_oi'], errors='coerce').fillna(0)
        
        dt = pd.to_datetime(df_nz['datetime'], unit='ns')
        df_nz['date_str'] = dt.dt.tz_localize('UTC').dt.tz_convert('Asia/Shanghai').dt.strftime('%Y-%m-%d')
        df_nz = df_nz[df_nz['date_str'] >= start_date_str]
        
        df_nz = df_nz[df_nz['hold'] > 0]
        if df_nz.empty:
            return None
            
        if len(df_nz) > 1:
            past_df = df_nz.iloc[:-1]
            hist_max_oi_past = int(past_df['hold'].max())
            hist_max_date = str(past_df.loc[past_df['hold'].idxmax(), 'date_str'])
        else:
            hist_max_oi_past = 0
            hist_max_date = ''
            
        current_row = df_nz.iloc[-1]
        current_oi = int(current_row['hold'])
        current_date = str(current_row['date_str'])
        
        if current_oi <= 0 and len(df_nz) > 1:
            current_row = df_nz.iloc[-2]
            current_oi = int(current_row['hold'])
            current_date = str(current_row['date_str'])
            
        historical_max_oi = max(hist_max_oi_past, current_oi)
        if historical_max_oi == current_oi and current_oi > hist_max_oi_past:
            historical_max_date = current_date
        else:
            historical_max_date = hist_max_date
            
        oi_ratio = current_oi / historical_max_oi if historical_max_oi > 0 else 0.0
        
        alert = 'normal'
        if historical_max_oi > 0:
            if current_oi >= historical_max_oi:
                alert = 'new_high'
            elif oi_ratio >= NEAR_HIGH_THRESH:
                alert = 'near_high'
                
        res = {
            'code': code,
            'name': cfg['name'],
            'exchange': cfg['exch'],
            'currentOI': current_oi,
            'historicalMaxOI': historical_max_oi,
            'historicalMaxDate': historical_max_date,
            'dataStart': str(df_nz.iloc[0]['date_str']),
            'oiRatio': oi_ratio,
            'alert': alert
        }
        return res
    except Exception as e:
        print(f"[-] screen_commodity_tq failed for {code}: {e}")
        return None

def sync_futures():
    print("=" * 70)
    print("  Summit Wind Portal | Full Market OI Screener + Sync  v6.1 (TqSdk Only Optimized)")
    print("  Coverage: SHFE / DCE / CZCE / INE / GFEX  (~50 contracts)")
    print("=" * 70)

    now_str = (datetime.datetime.utcnow() + datetime.timedelta(hours=8)).strftime('%Y-%m-%d %H:%M:%S')
    start_date_str = (datetime.datetime.utcnow() + datetime.timedelta(hours=8) - datetime.timedelta(days=365 * HISTORY_YEARS)).strftime('%Y-%m-%d')
    print(f"[+] Sync time (Beijing Time): {now_str}")
    print(f"[+] Query history since: {start_date_str}")

    username, password = load_tq_credentials()
    if not username or not password:
        print("[-] Error: TqSdk credentials (username/password) are required.")
        return False

    api = None
    try:
        print("[+] Connecting to TqSdk API...")
        api = TqApi(auth=TqAuth(username, password))
        margin_lookup = fetch_tq_margin_lookup(api, time, now_str, attempts=3)
    except Exception as e:
        print(f"[-] Error connecting to TqSdk: {e}")
        if api is not None:
            try:
                api.close()
            except Exception:
                pass
        return False

    # ──────────────────────────────────────────────────────────
    # PHASE 1: OI SCREEN — all commodities via TqSdk API (Parallel)
    # ──────────────────────────────────────────────────────────
    total = len(ALL_CFG)
    print(f"\n[Phase 1] Pre-registering all daily K-lines in parallel since {start_date_str}...\n")
    daily_klines_raw = {}
    for code in ALL_CFG.keys():
        sym = get_tq_main_symbol(code, ALL_CFG[code]['exch'])
        daily_klines_raw[code] = api.get_kline_serial(sym, duration_seconds=86400, data_length=2500)

    # Wait for all daily K-lines to download in parallel
    print("[+] Downloading all daily K-lines in parallel...")
    start_dl = time.time()
    while time.time() - start_dl < 10.0:
        all_loaded = all(not df.empty for df in daily_klines_raw.values())
        if not api.wait_update(deadline=time.time() + 0.2):
            if all_loaded:
                break
    print(f"[+] All daily K-lines download finished in {time.time() - start_dl:.2f} seconds.")

    print(f"\n[Phase 1] OI screening {total} commodities...\n")
    screening  = {}  # code -> screening result dict
    anomalies  = []  # codes meeting near_high or new_high
    daily_dfs  = {}  # code -> TqSdk daily DataFrame

    for idx, (code, cfg) in enumerate(ALL_CFG.items(), 1):
        df = daily_klines_raw.get(code)
        result = screen_commodity_tq(code, df, start_date_str)
        if result and df is not None:
            screening[code] = result
            daily_dfs[code] = df
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
    # PHASE 2: DETAIL FETCH — Target contracts (Anomalies Only)
    # ──────────────────────────────────────────────────────────
    detail_targets = set(anomalies)
    print(f"\n[Phase 2] Fetching K-line details for {len(detail_targets)} anomaly contracts: {anomalies}...\n")

    target_contracts = {}      # code -> specific contract month symbol (e.g. SHFE.sp2609)
    target_specific_quotes = {} # code -> specific contract quote details
    target_klines = {}         # code -> {'min1': ..., 'min5': ...}

    if detail_targets:
        try:
            print("[+] Subscribing to continuous main quotes on TqSdk...")
            target_main_quotes = {}
            for code in detail_targets:
                sym = get_tq_main_symbol(code, ALL_CFG[code]['exch'])
                target_main_quotes[code] = api.get_quote(sym)

            start_q = time.time()
            while time.time() - start_q < 4.0:
                if not api.wait_update(deadline=time.time() + 0.5):
                    break

            print("[+] Subscribing to specific contract quotes and minute K-lines...")
            for code in detail_targets:
                main_quote = target_main_quotes[code]
                main_sym_specific = main_quote.underlying_symbol

                if main_sym_specific:
                    target_contracts[code] = main_sym_specific
                    target_specific_quotes[code] = api.get_quote(main_sym_specific)
                    target_klines[code] = {
                        'min1':  api.get_kline_serial(main_sym_specific, 60, 1500),
                        'min5':  api.get_kline_serial(main_sym_specific, 300, 1500),
                        'min15': api.get_kline_serial(main_sym_specific, 900, 1500),
                        'min30': api.get_kline_serial(main_sym_specific, 1800, 1500),
                        'min60': api.get_kline_serial(main_sym_specific, 3600, 1500),
                    }
                else:
                    print(f"      [!] Warning: Could not resolve underlying specific symbol for {code}")

            print("[+] Downloading target detailed K-lines in parallel...")
            start_dl_det = time.time()
            while time.time() - start_dl_det < 8.0:
                all_loaded = True
                for code_det, kline_dict in target_klines.items():
                    for df_det in kline_dict.values():
                        if df_det.empty:
                            all_loaded = False
                            break
                    if not all_loaded:
                        break
                if not api.wait_update(deadline=time.time() + 0.2):
                    if all_loaded:
                        break
            print(f"[+] Target K-lines download finished in {time.time() - start_dl_det:.2f} seconds.")

        except Exception as e:
            print(f"[-] Error downloading detailed anomaly K-lines: {e}")

    # Process metadata and K-lines for all contracts
    contracts_meta = {}
    data_out       = {}

    for code in sorted(list(ALL_CFG.keys())):
        cfg = ALL_CFG[code]

        main_sym = None
        main_oi = 0
        main_price = 0.0
        daily = []
        min1 = []
        min5 = []
        min15 = []
        min30 = []
        min60 = []

        if code in daily_dfs:
            temp_df = daily_dfs[code]
            if temp_df is not None and not temp_df.empty:
                daily = fetch_daily_tq(pd, temp_df, start_date_str)
                if daily:
                    main_price = daily[-1]['close']
                    main_oi = daily[-1]['hold']

        if code in detail_targets:
            main_sym_specific = target_contracts.get(code)
            if main_sym_specific:
                kline_sym = main_sym_specific
                if '.' in main_sym_specific:
                    parts = main_sym_specific.split('.')
                    display_sym = parts[1].upper() if len(parts) == 2 else main_sym_specific
                else:
                    display_sym = main_sym_specific

                spec_quote = target_specific_quotes.get(code)
                if spec_quote:
                    if spec_quote.open_interest:
                        main_oi = int(spec_quote.open_interest)
                    if spec_quote.last_price:
                        main_price = float(spec_quote.last_price)

                print(f"      Main: {display_sym} ({main_sym_specific})  OI={main_oi:,}  price={main_price}")
            else:
                kline_sym = f"{code}0"
                display_sym = f"{code}(主力)"

            if code in target_klines:
                min_dict = target_klines[code]
                min1  = fetch_minute(pd, min_dict['min1'], n=1500)
                min5  = fetch_minute(pd, min_dict['min5'], n=1500)
                min15 = fetch_minute(pd, min_dict['min15'], n=1500)
                min30 = fetch_minute(pd, min_dict['min30'], n=1500)
                min60 = fetch_minute(pd, min_dict['min60'], n=1500)

            print(f"      1-min: {len(min1)} bars | 5-min: {len(min5)} bars | 15-min: {len(min15)} bars | 30-min: {len(min30)} bars | 60-min: {len(min60)} bars")
        else:
            kline_sym   = f"{code}0"
            display_sym = f"{code}(主力)"

        # Build metadata
        oi_screen = screening.get(code, {})
        margin_info = resolve_tq_margin_info(code, margin_lookup, kline_sym)
        contracts_meta[code] = {
            'symbol':      display_sym,
            'klineSource': kline_sym,
            'contractCode': margin_info['contractCode'],
            'name':        f"{cfg['name']}主力",
            'exchange':    cfg['exch'],
            'multiplier':  cfg['mult'],
            'marginPerLot': margin_info['marginPerLot'],
            'marginPerLotLong': margin_info['marginPerLotLong'],
            'marginPerLotShort': margin_info['marginPerLotShort'],
            'marginRateSource': margin_info['marginRateSource'],
            'marginRateAsOf': margin_info['marginRateAsOf'],
            'unit':        cfg['unit'],
            'openInterest':main_oi,
            'latestPrice': main_price,
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

        data_out[code] = {'daily': daily, 'min1': min1, 'min5': min5, 'min15': min15, 'min30': min30, 'min60': min60}

    try:
        api.close()
        print("[+] TqSdk API connection closed.")
    except Exception:
        pass

    # ──────────────────────────────────────────────────────────
    # OUTPUT JSON
    # ──────────────────────────────────────────────────────────
    failed_scans = sorted([code for code in ALL_CFG.keys() if code not in screening])

    output = {
        'metadata': {
            'sync_time':      now_str,
            'version':        '6.1',
            'description':    'Full market TqSdk OI screen | K-line data (TqSdk Only Optimized)',
            'historyYears':   HISTORY_YEARS,
            'nearHighThresh': NEAR_HIGH_THRESH,
            'anomalies':      anomalies,
            'failed_scans':   failed_scans,
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
            json.dump(output, f, ensure_ascii=False, indent=2, allow_nan=False)

        print("\n" + "=" * 70)
        print("[OK] Sync complete! (TqSdk Only Optimized)")
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
