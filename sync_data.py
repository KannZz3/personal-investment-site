# -*- coding: utf-8 -*-
"""
==========================================================================
FULL MARKET OI SCREENER + DATA SYNC (sync_data.py v4.0)
==========================================================================
【当前数据源限制说明】：
1. 合约覆盖范围：本脚本已实现对所有交易所、所有合约的数据同步，每日收盘后下载所有 50+ 合约的详细日线、分钟线及分时数据。
2. 周期覆盖范围与深度限制：
   - 分钟 K 线 (1m, 5m, 15m, 30m, 60m) 受限于新浪行情接口历史深度，只拉取最新最近约 1500 根 Bar 的滚动历史。
   - 日线 (daily) 拉取完整 10 年历史连续合约数据。
   - 周线与月线由网页端根据日线数据实时动态压缩生成，无需脚本单独下载。
   - TPO / VP 直方图由网页端依据 1m, 5m, 30m 基础分钟数据在 Canvas 上动态计算并渲染。

Output  : data/futures_data.json
Requires: pip install akshare pandas
"""

import os, json, sys, datetime

# Global monkeypatch for requests default timeout to prevent indefinite hangs
try:
    import requests
    original_request = requests.Session.request
    def timeout_request(self, method, url, *args, **kwargs):
        if 'timeout' not in kwargs or kwargs['timeout'] is None:
            kwargs['timeout'] = 15
        return original_request(self, method, url, *args, **kwargs)
    requests.Session.request = timeout_request
except ImportError:
    pass

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
    'FB': {'name':'纤维板',  'realtime':'纤维板',   'exch':'DCE',  'mult':10,  'margin':0.10,'unit':'立方米'},
    # ── CZCE 郑商所 ──────────────────────────────────
    'SR': {'name':'白糖',    'realtime':'白糖',     'exch':'CZCE', 'mult':10,  'margin':0.07,'unit':'吨'},
    'CF': {'name':'棉花',    'realtime':'棉花',     'exch':'CZCE', 'mult':5,   'margin':0.07,'unit':'吨'},
    'TA': {'name':'PTA',     'realtime':'PTA',      'exch':'CZCE', 'mult':5,   'margin':0.08,'unit':'吨'},
    'MA': {'name':'甲醇',    'realtime':'甲醇',     'exch':'CZCE', 'mult':10,  'margin':0.08,'unit':'吨'},
    'FG': {'name':'玻璃',    'realtime':'玻璃',     'exch':'CZCE', 'mult':20,  'margin':0.08,'unit':'吨'},
    'OI': {'name':'菜油',    'realtime':'菜油',     'exch':'CZCE', 'mult':10,  'margin':0.07,'unit':'吨'},
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
    'RS': {'name':'油菜籽',  'realtime':'油菜籽',   'exch':'CZCE','mult':10,  'margin':0.10,'unit':'吨'},
    'WH': {'name':'强麦',    'realtime':'强麦',     'exch':'CZCE','mult':20,  'margin':0.10,'unit':'吨'},
    'JR': {'name':'粳稻',    'realtime':'粳稻',     'exch':'CZCE','mult':20,  'margin':0.10,'unit':'吨'},
    'RI': {'name':'早籼稻',  'realtime':'早籼稻',   'exch':'CZCE','mult':20,  'margin':0.10,'unit':'吨'},
    'LR': {'name':'晚籼稻',  'realtime':'晚籼稻',   'exch':'CZCE','mult':20,  'margin':0.10,'unit':'吨'},
    'CY': {'name':'棉纱',    'realtime':'棉纱',     'exch':'CZCE','mult':5,   'margin':0.10,'unit':'吨'},
    'PF': {'name':'短纤',    'realtime':'短纤',     'exch':'CZCE','mult':5,   'margin':0.10,'unit':'吨'},
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

# Watchlist: empty (unused as the dashboard only displays screened anomaly contracts)
WATCHLIST = []

# Historical column order from futures_main_sina
HIST_COLS = ['date', 'open', 'high', 'low', 'close', 'volume', 'hold', 'ext']

# OI near-high threshold
NEAR_HIGH_THRESH = 0.90
HISTORY_YEARS = 10


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def get_tq_main_symbol(code, exch):
    """Format the TqSdk continuous main contract symbol based on exchange rules."""
    if exch == 'CZCE':
        return f"KQ.m@CZCE.{code.upper()}"
    else:
        return f"KQ.m@{exch}.{code.lower()}"


def get_kline_serial_loaded(api, symbol, duration_seconds, data_length):
    """Fetch K-line series and wait until the data is loaded from TqSdk server."""
    klines = api.get_kline_serial(symbol, duration_seconds, data_length)
    # Loop to wait for data to load
    for _ in range(100):  # safety timeout to prevent infinite block
        api.wait_update()
        if len(klines) > 0:
            if len(klines) >= data_length or not api.is_changing(klines):
                break
    return klines


def screen_commodity(api, pd, code, start_date):
    """
    Pull 10-year continuous main-contract history and compute OI significance.
    Returns a dict of screening results, or None on failure.
    """
    import time
    cfg = ALL_CFG[code]
    sym = get_tq_main_symbol(code, cfg['exch'])
    for attempt in range(3):
        try:
            df = get_kline_serial_loaded(api, sym, 86400, 3500)
            if df is None or df.empty:
                time.sleep(1)
                continue
            df = df.copy()
            df['date'] = pd.to_datetime(df['datetime'], unit='ns').dt.tz_localize('UTC').dt.tz_convert('Asia/Shanghai').dt.strftime('%Y-%m-%d')
            df['hold'] = pd.to_numeric(df['close_oi'], errors='coerce').fillna(0)
            
            # Convert pre-2020 bilateral hold to unilateral (Sina database transition date: 2020-01-02)
            def convert_to_unilateral(row):
                date_str = str(row['date'])
                if date_str < '2020-01-02':
                    return row['hold'] / 2.0
                return row['hold']
                
            df['hold'] = df.apply(convert_to_unilateral, axis=1)

            df_nz = df[df['hold'] > 0]
            if df_nz.empty:
                time.sleep(1)
                continue

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
            if attempt < 2:
                time.sleep(1.5)
            else:
                print(f"\n      [!] {code} screening failed final attempt: {e}")
                return None
    return None


def find_main_contract(api, pd, code, realtime_name):
    """
    Query continuous main contract symbol to get active contract, open interest, and last price.
    Returns (main_symbol, oi, price, display_symbol) or (None, 0, 0.0, None).
    """
    import time
    exch = ALL_CFG[code]['exch']
    sym = get_tq_main_symbol(code, exch)
    for attempt in range(3):
        try:
            quote = api.get_quote(sym)
            api.wait_update()
            main_sym = quote.underlying_symbol
            if main_sym:
                main_quote = api.get_quote(main_sym)
                api.wait_update()
                oi = int(main_quote.open_interest)
                price = float(main_quote.last_price)
                
                # Format to display symbol (e.g. SHFE.sp2609 -> SP2609)
                parts = main_sym.split('.')
                if len(parts) == 2:
                    contract_code = parts[1].upper()
                else:
                    contract_code = main_sym
                return main_sym, oi, price, contract_code
        except Exception:
            time.sleep(1)
    return None, 0, 0.0, None


def fetch_daily(api, pd, code, start_date):
    """
    Fetch full daily K-line via continuous main contract.
    """
    import time
    cfg = ALL_CFG[code]
    sym = get_tq_main_symbol(code, cfg['exch'])
    for attempt in range(3):
        try:
            df = get_kline_serial_loaded(api, sym, 86400, 3500)
            if df is None or df.empty:
                time.sleep(1)
                continue
            df = df.copy()
            df['date'] = pd.to_datetime(df['datetime'], unit='ns').dt.tz_localize('UTC').dt.tz_convert('Asia/Shanghai').dt.strftime('%Y-%m-%d')
            df['hold'] = pd.to_numeric(df['close_oi'], errors='coerce').fillna(0)
            
            # Convert pre-2020 bilateral hold to unilateral
            def _to_unilateral(row):
                return row['hold'] / 2.0 if str(row['date']) < '2020-01-02' else row['hold']
            df['hold'] = df.apply(_to_unilateral, axis=1)
            
            df = df.sort_values('date').dropna(subset=['open', 'close'])
            start_date_yf = f"{start_date[:4]}-{start_date[4:6]}-{start_date[6:]}"
            df = df[df['date'] >= start_date_yf]
            
            out = []
            for _, row in df.iterrows():
                out.append({
                    'date':   row['date'],
                    'open':   float(row['open']),
                    'high':   float(row['high']),
                    'low':    float(row['low']),
                    'close':  float(row['close']),
                    'volume': int(row['volume']),
                    'hold':   int(row['hold']),
                })
            return out
        except Exception as e:
            if attempt < 2:
                time.sleep(1.5)
            else:
                raise e


def fetch_minute(api, pd, symbol, period='15', n=1500):
    """Fetch intraday K-line bars for given period ('1'/'5'/'15'/'30'/'60')."""
    import time
    duration_seconds = int(period) * 60
    for attempt in range(3):
        try:
            df = get_kline_serial_loaded(api, symbol, duration_seconds, n)
            if df is None or df.empty:
                time.sleep(1)
                continue
            df = df.copy()
            df['datetime_str'] = pd.to_datetime(df['datetime'], unit='ns').dt.tz_localize('UTC').dt.tz_convert('Asia/Shanghai').dt.strftime('%Y-%m-%d %H:%M:%S')
            df['hold'] = pd.to_numeric(df['close_oi'], errors='coerce').fillna(0)
            df = df.sort_values('datetime_str').tail(n)
            
            out = []
            for _, row in df.iterrows():
                out.append({
                    'datetime': row['datetime_str'],
                    'open':  float(row['open']),
                    'high':  float(row['high']),
                    'low':   float(row['low']),
                    'close': float(row['close']),
                    'volume':int(row['volume']),
                    'hold':  int(row['hold']),
                })
            return out
        except Exception:
            if attempt < 2:
                time.sleep(1.5)
            else:
                return []
    return []


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def sync_futures():
    print("=" * 70)
    print("  Summit Wind Portal | Full Market OI Screener + Sync  v5.0 (TqSdk)")
    print("  Coverage: SHFE / DCE / CZCE / INE / GFEX  (~50 contracts)")
    print("=" * 70)

    try:
        import pandas as pd
    except ImportError:
        print("[-] pip install pandas")
        return False

    # Load credentials from config.json
    username = None
    password = None
    config_paths = [
        os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json'),
        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'config.json')
    ]
    for path in config_paths:
        if os.path.exists(path):
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    cfg_data = json.load(f)
                    username = cfg_data.get('tq_username')
                    password = cfg_data.get('tq_password')
                    if username and password and "请" not in username:
                        print(f"[+] Loaded TqSdk credentials from {path}")
                        break
            except Exception as e:
                print(f"[-] Error reading {path}: {e}")

    if not username or not password or "请" in username:
        print("[-] 错误: 未能在本地或桌面找到有效的天勤账号密码文件 config.json，或者尚未配置账号密码。")
        print("    请在桌面上的 config.json 中配置您的天勤账号和密码。")
        return False

    try:
        from tqsdk import TqApi, TqAuth
        api = TqApi(auth=TqAuth(username, password))
    except Exception as e:
        print(f"[-] 天勤登录认证失败: {e}")
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

    try:
        for idx, (code, cfg) in enumerate(ALL_CFG.items(), 1):
            result = screen_commodity(api, pd, code, start_date)
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
        # PHASE 2: DETAIL FETCH — Target contracts (Anomalies Only)
        # ──────────────────────────────────────────────────────────
        detail_targets = set(anomalies)
        print(f"\n[Phase 2] Fetching K-line details for {len(detail_targets)} anomaly contracts: {anomalies}...\n")

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

            if code in detail_targets:
                print(f"  [+] {cfg['name']} ({code}) @ {cfg['exch']} (Target)")
                
                # Find actual main contract month
                main_sym_tq, main_oi, main_price, display_sym = find_main_contract(api, pd, code, cfg['realtime'])
                if main_sym_tq:
                    kline_sym   = main_sym_tq
                    print(f"      Main: {display_sym} ({main_sym_tq})  OI={main_oi:,}  price={main_price}")
                else:
                    kline_sym   = get_tq_main_symbol(code, cfg['exch'])
                    display_sym = f"{code}(主力)"
                    screen_curr = screening.get(code, {}).get('currentOI', 0)
                    main_oi     = screen_curr
                    main_price  = 0.0

                # Daily K-line (full 10-year history)
                try:
                    daily = fetch_daily(api, pd, code, start_date)
                    print(f"      Daily: {len(daily)} bars")
                except Exception as e:
                    print(f"      Daily FAILED ({e})")
                    daily = []

                # Intraday K-lines: 1M, 5M, 15M, 30M, 60M
                min1  = fetch_minute(api, pd, kline_sym, period='1', n=1500)
                min5  = fetch_minute(api, pd, kline_sym, period='5', n=1500)
                min15 = fetch_minute(api, pd, kline_sym, period='15', n=1500)
                min30 = fetch_minute(api, pd, kline_sym, period='30', n=1500)
                min60 = fetch_minute(api, pd, kline_sym, period='60', n=1500)
                print(f"      1-min: {len(min1)} bars | 5-min: {len(min5)} bars | 15-min: {len(min15)} bars | 30-min: {len(min30)} bars | 60-min: {len(min60)} bars")
            else:
                # For non-target contracts, we don't fetch K-lines, but we still populate basic metadata
                kline_sym   = get_tq_main_symbol(code, cfg['exch'])
                display_sym = f"{code}(主力)"
                screen_curr = screening.get(code, {}).get('currentOI', 0)
                main_oi     = screen_curr
                main_price  = 0.0

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

            data_out[code] = {'daily': daily, 'min1': min1, 'min5': min5, 'min15': min15, 'min30': min30, 'min60': min60}

        # ──────────────────────────────────────────────────────────
        # OUTPUT JSON
        # ──────────────────────────────────────────────────────────
        failed_scans = sorted([code for code in ALL_CFG.keys() if code not in screening])
        
        output = {
            'metadata': {
                'sync_time':      now_str,
                'version':        '5.0',
                'description':    'Full market TqSdk OI screen | watchlist + anomaly K-line data',
                'historyYears':   HISTORY_YEARS,
                'nearHighThresh': NEAR_HIGH_THRESH,
                'watchlist':      WATCHLIST,
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
    finally:
        # Make sure to close the TqApi connection to release resources
        try:
            api.close()
            print("[+] TqSdk API connection closed.")
        except Exception:
            pass


if __name__ == '__main__':
    sys.exit(0 if sync_futures() else 1)
