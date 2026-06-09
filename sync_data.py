# -*- coding: utf-8 -*-
"""
==========================================================================
FULL MARKET OI SCREENER + DATA SYNC (sync_data.py v4.0)
==========================================================================
【当前数据源限制说明】：
1. 合约覆盖范围：本脚本已实现对所有交易所、所有合约的数据同步，每日收盘后下载所有 50+ 合约的详细日线、分钟线及分时数据。
2. 周期覆盖范围与深度限制：
   - 分钟 K 线 (1m, 5m, 15m, 30m, 60m) 受限于新浪行情接口历史深度，只拉取最新最近约 1500 根 Bar 的滚动历史。
   - 全市场筛选使用 10 年连续主力日线；异动合约图表使用当前具体月份合约日线。
   - 周线与月线由网页端根据具体月份合约日线实时动态压缩生成，无需脚本单独下载。
   - TPO / VP 直方图由网页端依据 1m, 5m, 30m 基础分钟数据在 Canvas 上动态计算并渲染。

Output  : data/futures_data.json
Requires: pip install akshare pandas
"""

import os, json, sys, datetime, math

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
    'EB': {'name':'苯乙烯',  'realtime':'苯乙烯',   'exch':'DCE',  'mult':5,   'margin':0.09,'unit':'吨'},
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

# Historical column order from futures_main_sina
HIST_COLS = ['date', 'open', 'high', 'low', 'close', 'volume', 'hold', 'ext']

# OI near-high threshold
NEAR_HIGH_THRESH = 0.90
HISTORY_YEARS = 10
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────

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
        text = text.split('.')[-1]
    return ''.join(ch for ch in text.upper() if ch.isalnum())


def get_column(df, name, index):
    """Return a DataFrame column by name, with index fallback for upstream schema drift."""
    return name if name in df.columns else df.columns[index]


def build_margin_info_from_row(row, cols):
    long_rate = finite_float(row[cols['long_margin']], 0.0)
    short_rate = finite_float(row[cols['short_margin']], 0.0)
    long_margin_per_lot = finite_float(row[cols['long_margin_per_lot']], 0.0)
    short_margin_per_lot = finite_float(row[cols['short_margin_per_lot']], 0.0)
    valid_rates = [rate for rate in (long_rate, short_rate) if rate > 0]
    valid_margins = [value for value in (long_margin_per_lot, short_margin_per_lot) if value > 0]
    if not valid_rates and not valid_margins:
        return None

    # Keep marginRate compatible with the existing front-end formula:
    # single-side OI * 2 * price * multiplier * marginRate.
    margin_rate = sum(valid_rates) / len(valid_rates) if valid_rates else 0.0
    return {
        'contractCode': normalize_contract_code(row[cols['contract']]),
        'marginRate': margin_rate,
        'marginRateLong': long_rate,
        'marginRateShort': short_rate,
        'marginPerLot': sum(valid_margins) / len(valid_margins) if valid_margins else 0.0,
        'marginPerLotLong': long_margin_per_lot,
        'marginPerLotShort': short_margin_per_lot,
        'marginRateAsOf': str(row[cols['updated_at']]),
        'marginRateSource': 'akshare.futures_fees_info/openctp',
        'marginOpenInterest': int(finite_float(row[cols['open_interest']], 0)),
    }


def fill_margin_lookup_from_rule(ak, lookup, codes, now_str):
    """Fill missing products from the daily futures rule table when contract-level rows are absent."""
    if not codes:
        return

    for offset in range(8):
        date_str = (datetime.datetime.now() - datetime.timedelta(days=offset)).strftime('%Y%m%d')
        try:
            df = ak.futures_rule(date=date_str)
            if df is None or df.empty:
                continue

            code_col = get_column(df, '\u4ee3\u7801', 2)
            margin_col = get_column(df, '\u4ea4\u6613\u4fdd\u8bc1\u91d1\u6bd4\u4f8b', 3)
            for code in codes:
                rows = df[df[code_col].astype(str).str.upper().str.replace('_O', '', regex=False) == code.upper()]
                if rows.empty:
                    continue

                margin_rate = finite_float(rows.iloc[0][margin_col], 0.0) / 100
                if margin_rate <= 0:
                    continue

                lookup['by_code'][code] = {
                    'contractCode': f"{code}0",
                    'marginRate': margin_rate,
                    'marginRateLong': margin_rate,
                    'marginRateShort': margin_rate,
                    'marginPerLot': 0,
                    'marginPerLotLong': 0,
                    'marginPerLotShort': 0,
                    'marginRateAsOf': date_str,
                    'marginRateSource': 'akshare.futures_rule/gtja',
                    'marginOpenInterest': 0,
                }

            return
        except Exception:
            continue

    print(f"[-] Margin rule fallback unavailable for: {sorted(codes)}")


def fetch_margin_rate_lookup(ak, pd, now_str):
    """Fetch daily contract-level margin rates and build product/contract lookup maps."""
    lookup = {'by_code': {}, 'by_contract': {}, 'source': 'fallback:ALL_CFG', 'asOf': now_str}

    try:
        df = ak.futures_fees_info()
        if df is None or df.empty:
            raise ValueError('empty futures_fees_info result')

        cols = {
            'exchange': get_column(df, '\u4ea4\u6613\u6240', 0),
            'contract': get_column(df, '\u5408\u7ea6\u4ee3\u7801', 1),
            'product': get_column(df, '\u54c1\u79cd\u4ee3\u7801', 3),
            'multiplier': get_column(df, '\u5408\u7ea6\u4e58\u6570', 5),
            'long_margin': get_column(df, '\u505a\u591a\u4fdd\u8bc1\u91d1\u7387', 13),
            'short_margin': get_column(df, '\u505a\u7a7a\u4fdd\u8bc1\u91d1\u7387', 15),
            'long_margin_per_lot': get_column(df, '\u505a\u591a1\u624b\u4fdd\u8bc1\u91d1', 25),
            'short_margin_per_lot': get_column(df, '\u505a\u7a7a1\u624b\u4fdd\u8bc1\u91d1', 26),
            'open_interest': get_column(df, '\u6301\u4ed3\u91cf', 21),
            'updated_at': get_column(df, '\u66f4\u65b0\u65f6\u95f4', 37),
        }

        for _, row in df.iterrows():
            code = str(row[cols['product']]).upper().strip()
            if code not in ALL_CFG:
                continue

            info = build_margin_info_from_row(row, cols)
            if not info or not info['contractCode']:
                continue

            lookup['by_contract'][info['contractCode']] = info
            current = lookup['by_code'].get(code)
            if current is None or info['marginOpenInterest'] > current.get('marginOpenInterest', -1):
                lookup['by_code'][code] = info

        missing_codes = [code for code in ALL_CFG.keys() if code not in lookup['by_code']]
        fill_margin_lookup_from_rule(ak, lookup, missing_codes, now_str)

        if lookup['by_code']:
            as_of_values = [v.get('marginRateAsOf', '') for v in lookup['by_code'].values() if v.get('marginRateAsOf')]
            lookup['source'] = 'akshare.futures_fees_info/openctp'
            lookup['asOf'] = max(as_of_values) if as_of_values else now_str
            print(f"[+] Margin rates loaded from {lookup['source']} as of {lookup['asOf']} ({len(lookup['by_code'])}/{len(ALL_CFG)} products)")
            return lookup

        raise ValueError('no matching product margin rows')
    except Exception as e:
        print(f"[-] Contract-level margin rate fetch failed: {e}")
        fill_margin_lookup_from_rule(ak, lookup, ALL_CFG.keys(), now_str)
        if lookup['by_code']:
            lookup['source'] = 'akshare.futures_rule/gtja'
            lookup['asOf'] = max([v.get('marginRateAsOf', '') for v in lookup['by_code'].values() if v.get('marginRateAsOf')] or [now_str])
            print(f"[+] Margin rates loaded from {lookup['source']} as of {lookup['asOf']} ({len(lookup['by_code'])}/{len(ALL_CFG)} products)")
            return lookup
        print("[-] Margin rate dynamic sources unavailable; using ALL_CFG fallback.")
        return lookup


def resolve_margin_info(code, cfg, margin_lookup, preferred_contract=None, now_str=''):
    """Resolve margin metadata for the concrete contract, falling back safely."""
    normalized = normalize_contract_code(preferred_contract)
    info = margin_lookup.get('by_contract', {}).get(normalized) if normalized else None
    if info is None:
        info = margin_lookup.get('by_code', {}).get(code)
    if info is not None:
        return dict(info)

    return {
        'contractCode': normalized or f"{code}0",
        'marginRate': cfg['margin'],
        'marginRateLong': cfg['margin'],
        'marginRateShort': cfg['margin'],
        'marginPerLot': 0,
        'marginPerLotLong': 0,
        'marginPerLotShort': 0,
        'marginRateAsOf': now_str,
        'marginRateSource': 'fallback:ALL_CFG',
        'marginOpenInterest': 0,
    }


def build_margin_info_from_tq_quote(code, quote, now_str):
    """Build per-lot margin metadata from TqSdk quote.margin."""
    margin_per_lot = finite_float(getattr(quote, 'margin', 0), 0.0)
    volume_multiple = finite_float(getattr(quote, 'volume_multiple', 0), 0.0)
    pre_settlement = finite_float(getattr(quote, 'pre_settlement', 0), 0.0)
    margin_rate = margin_per_lot / (volume_multiple * pre_settlement) if margin_per_lot > 0 and volume_multiple > 0 and pre_settlement > 0 else 0.0
    if margin_per_lot <= 0 and margin_rate <= 0:
        return None

    symbol = getattr(quote, 'instrument_id', '') or getattr(quote, 'underlying_symbol', '')
    return {
        'contractCode': normalize_contract_code(symbol) or f"{code}0",
        'marginRate': margin_rate,
        'marginRateLong': margin_rate,
        'marginRateShort': margin_rate,
        'marginPerLot': margin_per_lot,
        'marginPerLotLong': margin_per_lot,
        'marginPerLotShort': margin_per_lot,
        'marginRateAsOf': now_str,
        'marginRateSource': 'tqsdk.quote.margin',
        'marginOpenInterest': int(finite_float(getattr(quote, 'open_interest', 0), 0)),
    }


def fetch_tq_margin_lookup(api, time, now_str):
    """Fetch per-lot margin for all current main contracts via TqSdk."""
    lookup = {'by_code': {}, 'by_contract': {}, 'source': 'tqsdk.quote.margin', 'asOf': now_str}
    try:
        main_quotes = {}
        for code, cfg in ALL_CFG.items():
            main_quotes[code] = api.get_quote(get_tq_main_symbol(code, cfg['exch']))

        start_q = time.time()
        while time.time() - start_q < 4.0:
            api.wait_update(deadline=time.time() + 0.5)
            if all(getattr(q, 'underlying_symbol', '') for q in main_quotes.values()):
                break

        specific_quotes = {}
        for code, quote in main_quotes.items():
            symbol = getattr(quote, 'underlying_symbol', '') or get_tq_main_symbol(code, ALL_CFG[code]['exch'])
            specific_quotes[code] = api.get_quote(symbol)

        start_detail = time.time()
        while time.time() - start_detail < 5.0:
            api.wait_update(deadline=time.time() + 0.5)
            ready = 0
            for quote in specific_quotes.values():
                if finite_float(getattr(quote, 'margin', 0), 0.0) > 0:
                    ready += 1
            if ready >= len(specific_quotes):
                break

        for code, quote in specific_quotes.items():
            info = build_margin_info_from_tq_quote(code, quote, now_str)
            if not info:
                continue
            lookup['by_code'][code] = info
            lookup['by_contract'][info['contractCode']] = info

        print(f"[+] TqSdk per-lot margins loaded ({len(lookup['by_code'])}/{len(ALL_CFG)} products)")
    except Exception as e:
        print(f"[-] TqSdk margin fetch failed: {e}")
    return lookup


def merge_margin_lookup(base_lookup, preferred_lookup):
    """Overlay preferred margin lookup entries over the base fallback lookup."""
    if not preferred_lookup:
        return base_lookup
    base_lookup['by_code'].update(preferred_lookup.get('by_code', {}))
    base_lookup['by_contract'].update(preferred_lookup.get('by_contract', {}))
    if preferred_lookup.get('by_code'):
        base_lookup['source'] = preferred_lookup.get('source', base_lookup.get('source'))
        base_lookup['asOf'] = preferred_lookup.get('asOf', base_lookup.get('asOf'))
    return base_lookup


def get_tq_main_symbol(code, exch):
    """Format the TqSdk continuous main contract symbol based on exchange rules."""
    if exch == 'CZCE':
        return f"KQ.m@CZCE.{code.upper()}"
    else:
        return f"KQ.m@{exch}.{code.lower()}"


def screen_commodity(ak, pd, code, start_date):
    """
    Pull 10-year continuous main-contract history via Sina API and compute OI significance.
    Returns (screening_result_dict, daily_dataframe) or (None, None) on failure.
    """
    import time
    cfg = ALL_CFG[code]
    sym = f"{code}0"
    for attempt in range(3):
        try:
            df = ak.futures_main_sina(symbol=sym, start_date=start_date)
            if df is None or df.empty:
                time.sleep(1)
                continue
            df.columns = HIST_COLS[:len(df.columns)]
            df['hold'] = pd.to_numeric(df['hold'], errors='coerce').fillna(0)
            
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
            }, df
        except Exception as e:
            if attempt < 2:
                time.sleep(1.5)
            else:
                print(f"\n      [!] {code} screening failed final attempt: {e}")
                return None, None
    return None, None


def fetch_daily(pd, df, start_date):
    """
    Format and filter pre-loaded daily DataFrame.
    """
    if df is None or df.empty:
        return []
    try:
        df = df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df['open'] = pd.to_numeric(df['open'], errors='coerce')
        df['high'] = pd.to_numeric(df['high'], errors='coerce')
        df['low'] = pd.to_numeric(df['low'], errors='coerce')
        df['close'] = pd.to_numeric(df['close'], errors='coerce')
        df['volume'] = pd.to_numeric(df['volume'], errors='coerce').fillna(0).astype(int)
        df['hold'] = pd.to_numeric(df['hold'], errors='coerce').fillna(0).astype(int)
        
        df = df.sort_values('date').dropna(subset=['open', 'close'])
        start_date_yf = f"{start_date[:4]}-{start_date[4:6]}-{start_date[6:]}"
        df = df[df['date'] >= start_date_yf]
        
        out = []
        for _, row in df.iterrows():
            out.append({
                'date':   row['date'].strftime('%Y-%m-%d'),
                'open':   float(row['open']),
                'high':   float(row['high']),
                'low':    float(row['low']),
                'close':  float(row['close']),
                'volume': int(row['volume']),
                'hold':   int(row['hold']),
            })
        return out
    except Exception as e:
        print(f"Error parsing daily: {e}")
        return []


def fetch_specific_daily_sina(ak, pd, symbol, start_date):
    """Fetch and format daily K-lines for a specific contract month symbol."""
    import time
    clean_symbol = symbol.split('.')[-1].upper() if symbol else ''
    for attempt in range(3):
        try:
            df = ak.futures_zh_daily_sina(symbol=clean_symbol)
            if df is None or df.empty:
                time.sleep(1)
                continue
            return fetch_daily(pd, df, start_date)
        except Exception:
            if attempt < 2:
                time.sleep(1.5)
            else:
                return []
    return []


def fetch_minute(pd, df, n=1500):
    """Format pre-loaded minute DataFrame from TqSdk."""
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
        # TqSdk fixed-size K-line containers can include empty epoch placeholders
        # when the requested bar count exceeds the contract's real history.
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


def find_main_contract_sina(ak, pd, code, realtime_name):
    """
    Query futures_zh_realtime via Sina to find the active contract with highest open interest.
    Used as fallback when TqSdk is not available.
    """
    import time
    for attempt in range(3):
        try:
            df = ak.futures_zh_realtime(symbol=realtime_name)
            if df is None or df.empty:
                time.sleep(1)
                continue
            df_real = df[~df['symbol'].str.endswith('0')].copy()
            df_real = df_real[df_real['symbol'].str.contains(r'\d', regex=True)]
            if df_real.empty:
                time.sleep(1)
                continue
            df_real['position'] = pd.to_numeric(df_real['position'], errors='coerce').fillna(0)
            row = df_real.loc[df_real['position'].idxmax()]
            sym   = str(row['symbol']).upper()
            oi    = int(row['position'])
            price = float(row.get('trade', row.get('close', 0)))
            if sym.startswith(code.upper()) and oi > 0:
                return sym, oi, price
        except Exception:
            time.sleep(1)
    return None, 0, 0.0


def fetch_minute_sina(ak, pd, symbol, period='15', n=1500):
    """Fetch intraday K-line bars via Sina for given period. Used as fallback."""
    import time
    for attempt in range(3):
        try:
            df = ak.futures_zh_minute_sina(symbol=symbol, period=period)
            if df is None or df.empty:
                time.sleep(1)
                continue
            for col in ['open', 'high', 'low', 'close', 'volume', 'hold']:
                if col in df.columns:
                    df[col] = pd.to_numeric(df[col], errors='coerce')
            df = df.dropna(subset=['datetime', 'open', 'high', 'low', 'close'])
            df['datetime'] = pd.to_datetime(df['datetime'])
            df = df.sort_values('datetime').tail(n)
            out = []
            for _, row in df.iterrows():
                out.append({
                    'datetime': row['datetime'].strftime('%Y-%m-%d %H:%M:%S'),
                    'open':  finite_float(row['open']),
                    'high':  finite_float(row['high']),
                    'low':   finite_float(row['low']),
                    'close': finite_float(row['close']),
                    'volume':int(finite_float(row['volume'], 0)),
                    'hold':  int(finite_float(row.get('hold', 0), 0)),
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
    print("  Summit Wind Portal | Full Market OI Screener + Sync  v5.0 (Hybrid)")
    print("  Coverage: SHFE / DCE / CZCE / INE / GFEX  (~50 contracts)")
    print("=" * 70)

    try:
        import akshare as ak
        import pandas as pd
        import time
    except ImportError:
        print("[-] pip install akshare pandas")
        return False

    now_str    = datetime.datetime.now().isoformat()
    start_date = (datetime.datetime.now() - datetime.timedelta(days=HISTORY_YEARS * 365)).strftime('%Y%m%d')
    total = len(ALL_CFG)
    margin_lookup = fetch_margin_rate_lookup(ak, pd, now_str)

    # ──────────────────────────────────────────────────────────
    # PHASE 1: OI SCREEN — all commodities via Sina API
    # ──────────────────────────────────────────────────────────
    print(f"\n[Phase 1] OI screening {total} commodities since {start_date[:4]}...\n")
    screening  = {}  # code -> screening result dict
    anomalies  = []  # codes meeting near_high or new_high
    daily_dfs  = {}  # code -> Sina daily DataFrame

    for idx, (code, cfg) in enumerate(ALL_CFG.items(), 1):
        result, df = screen_commodity(ak, pd, code, start_date)
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
    use_tq_sdk = False

    if detail_targets:
        # Load credentials (env variables first, then local config files)
        username = os.environ.get('TQ_USERNAME')
        password = os.environ.get('TQ_PASSWORD')
        
        if not username or not password:
            user_profile = os.environ.get('USERPROFILE', 'C:\\Users\\78432')
            config_paths = [
                os.path.join(os.path.dirname(os.path.abspath(__file__)), 'config.json'),
                os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'config.json'),
                os.path.abspath(os.path.join(user_profile, 'Desktop', 'config.json')),
                os.path.abspath(os.path.join(user_profile, 'OneDrive', 'Desktop', 'config.json')),
                os.path.abspath(os.path.join(user_profile, 'OneDrive', '桌面', 'config.json'))
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

        if username and password and "请" not in username:
            try:
                from tqsdk import TqApi, TqAuth
                print("[+] Connecting to TqSdk API...")
                api = TqApi(auth=TqAuth(username, password))
                use_tq_sdk = True
            except Exception as e:
                print(f"[-] 天勤登录认证失败: {e}. 将降级使用新浪财经 API。")
        else:
            print("[-] 未配置天勤账号密码，将降级使用新浪财经 API 进行数据更新。")

        if use_tq_sdk:
            try:
                # Step 2.1: Register continuous main contract quotes to resolve the specific active contracts
                print("[+] Subscribing to continuous main quotes on TqSdk...")
                target_main_quotes = {}
                for code in detail_targets:
                    sym = get_tq_main_symbol(code, ALL_CFG[code]['exch'])
                    target_main_quotes[code] = api.get_quote(sym)

                # Wait for quotes to update so underlying_symbol is resolved
                start_q = time.time()
                while time.time() - start_q < 4.0:
                    if not api.wait_update(deadline=time.time() + 0.5):
                        break

                # Step 2.2: Register detailed K-lines and specific quotes
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

                # Wait for all detailed K-lines to download in parallel
                print("[+] Downloading target detailed K-lines in parallel...")
                start_dl_det = time.time()
                while time.time() - start_dl_det < 8.0:
                    if not api.wait_update(deadline=time.time() + 1.0):
                        break
                print(f"[+] Target K-lines download finished in {time.time() - start_dl_det:.2f} seconds.")
                margin_lookup = merge_margin_lookup(margin_lookup, fetch_tq_margin_lookup(api, time, now_str))

            finally:
                # Make sure to close the TqApi connection to release resources
                try:
                    api.close()
                    print("[+] TqSdk API connection closed.")
                except Exception:
                    pass
        else:
            # Fallback to Sina API details
            print("[+] Fetching specific contract codes and quotes via Sina API...")
            for code in detail_targets:
                cfg = ALL_CFG[code]
                main_sym, main_oi, main_price = find_main_contract_sina(ak, pd, code, cfg['realtime'])
                if main_sym:
                    target_contracts[code] = main_sym
                    target_specific_quotes[code] = {'oi': main_oi, 'price': main_price}
                else:
                    target_contracts[code] = f"{code}0"
                    target_specific_quotes[code] = {'oi': 0, 'price': 0.0}

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

        # Extract daily from pre-loaded Sina daily data
        if code in daily_dfs:
            temp_df = daily_dfs[code]
            if temp_df is not None and not temp_df.empty:
                main_price = float(temp_df.iloc[-1]['close'])
                main_oi = int(temp_df.iloc[-1]['hold'])
            
        if code in detail_targets:
            main_sym_specific = target_contracts.get(code)
            if main_sym_specific:
                kline_sym = main_sym_specific
                if '.' in main_sym_specific:
                    parts = main_sym_specific.split('.')
                    display_sym = parts[1].upper() if len(parts) == 2 else main_sym_specific
                else:
                    display_sym = main_sym_specific
                
                # Retrieve quote details
                spec_quote = target_specific_quotes.get(code)
                if spec_quote:
                    if use_tq_sdk:
                        if spec_quote.open_interest:
                            main_oi = int(spec_quote.open_interest)
                        if spec_quote.last_price:
                            main_price = float(spec_quote.last_price)
                    else:
                        main_oi = spec_quote.get('oi', 0)
                        main_price = spec_quote.get('price', 0.0)
                    
                print(f"      Main: {display_sym} ({main_sym_specific})  OI={main_oi:,}  price={main_price}")
            else:
                kline_sym = f"{code}0"
                display_sym = f"{code}(主力)"

            # Daily K-lines for anomaly charts must match the specific contract month
            # shown in the dashboard; weekly/monthly are derived from this daily data.
            daily = fetch_specific_daily_sina(ak, pd, kline_sym, start_date)
            if not daily and code in daily_dfs:
                print(f"      [!] Specific daily fetch failed for {display_sym}; falling back to continuous daily.")
                daily = fetch_daily(pd, daily_dfs.get(code), start_date)

            # Extract minute K-lines
            if use_tq_sdk:
                if code in target_klines:
                    min_dict = target_klines[code]
                    min1  = fetch_minute(pd, min_dict['min1'], n=1500)
                    min5  = fetch_minute(pd, min_dict['min5'], n=1500)
                    min15 = fetch_minute(pd, min_dict['min15'], n=1500)
                    min30 = fetch_minute(pd, min_dict['min30'], n=1500)
                    min60 = fetch_minute(pd, min_dict['min60'], n=1500)
            else:
                min1  = fetch_minute_sina(ak, pd, kline_sym, period='1', n=1500)
                min5  = fetch_minute_sina(ak, pd, kline_sym, period='5', n=1500)
                min15 = fetch_minute_sina(ak, pd, kline_sym, period='15', n=1500)
                min30 = fetch_minute_sina(ak, pd, kline_sym, period='30', n=1500)
                min60 = fetch_minute_sina(ak, pd, kline_sym, period='60', n=1500)

            print(f"      1-min: {len(min1)} bars | 5-min: {len(min5)} bars | 15-min: {len(min15)} bars | 30-min: {len(min30)} bars | 60-min: {len(min60)} bars")
        else:
            kline_sym   = f"{code}0"
            display_sym = f"{code}(主力)"

        # Build metadata
        oi_screen = screening.get(code, {})
        margin_info = resolve_margin_info(code, cfg, margin_lookup, kline_sym, now_str)
        contracts_meta[code] = {
            'symbol':      display_sym,
            'klineSource': kline_sym,
            'contractCode': margin_info['contractCode'],
            'name':        f"{cfg['name']}主力",
            'exchange':    cfg['exch'],
            'multiplier':  cfg['mult'],
            'marginRate':  margin_info['marginRate'],
            'marginRateLong':  margin_info['marginRateLong'],
            'marginRateShort': margin_info['marginRateShort'],
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

    # ──────────────────────────────────────────────────────────
    # OUTPUT JSON
    # ──────────────────────────────────────────────────────────
    failed_scans = sorted([code for code in ALL_CFG.keys() if code not in screening])
    
    output = {
        'metadata': {
            'sync_time':      now_str,
            'version':        '5.0',
            'description':    'Full market TqSdk OI screen | anomaly K-line data',
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
        status_suffix = " (TqSdk)" if use_tq_sdk else " (Sina Fallback)"
        print(f"[OK] Sync complete!{status_suffix}")
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

