# -*- coding: utf-8 -*-
"""
==========================================================================
SMART FUTURES DATA SYNC PIPELINE  (personal-investment-site/sync_data.py)
==========================================================================
核心逻辑:
1. 使用 ak.futures_zh_realtime 查询每个品种所有活跃合约的实时持仓量。
2. 自动选取持仓量最大的合约作为「主力合约」（排除连续合约"0"后缀）。
3. 拉取该主力合约的 120 天日K线与最近 40 根 15 分钟分时线。
4. 数据以「品种代码」(AU/CU/RB...) 为 key 保存为 JSON，
   metadata 中记录当前主力合约完整代号与持仓量，供前端展示。

运行依赖: pip install akshare pandas
"""

import os
import json
import datetime
import sys


# =========================================================
# 品种基础配置
# realtime_name: futures_zh_realtime(symbol=...) 参数
# =========================================================
COMMODITY_CFG = {
    'AU': {'name': '沪金',   'realtime_name': '黄金',  'exchange': 'SHFE', 'multiplier': 1000, 'margin': 0.08, 'unit': '克'},
    'CU': {'name': '沪铜',   'realtime_name': '沪铜',  'exchange': 'SHFE', 'multiplier': 5,    'margin': 0.10, 'unit': '吨'},
    'RB': {'name': '螺纹钢', 'realtime_name': '螺纹钢','exchange': 'SHFE', 'multiplier': 10,   'margin': 0.09, 'unit': '吨'},
    'SC': {'name': '原油',   'realtime_name': '原油',  'exchange': 'INE',  'multiplier': 1000, 'margin': 0.11, 'unit': '桶'},
    'SR': {'name': '白糖',   'realtime_name': '白糖',  'exchange': 'CZCE', 'multiplier': 10,   'margin': 0.07, 'unit': '吨'},
    'TA': {'name': 'PTA',    'realtime_name': 'PTA',   'exchange': 'CZCE', 'multiplier': 5,    'margin': 0.08, 'unit': '吨'},
}


def find_main_contract_by_oi(ak, pd, base_code, realtime_name):
    """
    通过 futures_zh_realtime 查询所有活跃合约，找到持仓量最大的主力合约。
    排除连续合约（以'0'结尾的代码，如 CU0），只考虑实际交割合约。
    返回: (合约代号 str, 持仓量 int, 最新价 float)  或  (None, 0, 0)
    """
    try:
        df = ak.futures_zh_realtime(symbol=realtime_name)
        if df is None or df.empty:
            return None, 0, 0.0

        # 过滤掉连续合约（以"0"结尾或不含数字的）
        df_real = df[~df['symbol'].str.endswith('0')].copy()
        df_real = df_real[df_real['symbol'].str.contains(r'\d', regex=True)]

        if df_real.empty:
            return None, 0, 0.0

        # 转换持仓量为数字
        df_real['position'] = pd.to_numeric(df_real['position'], errors='coerce').fillna(0)

        # 找最大持仓量的合约
        max_idx = df_real['position'].idxmax()
        main_row = df_real.loc[max_idx]

        main_sym = str(main_row['symbol']).upper().strip()
        main_oi = int(main_row['position'])
        main_price = float(main_row.get('trade', main_row.get('close', 0)))

        # 验证合约代码格式（应以品种字母开头）
        if main_sym.startswith(base_code.upper()) and main_oi > 0:
            print(f"    [OI OK] Main contract: {main_sym} (OI: {main_oi:,})")
            return main_sym, main_oi, main_price

    except Exception as e:
        print(f"    [-] OI查询失败: {e}")

    return None, 0, 0.0


def fetch_daily(ak, pd, symbol):
    """拉取日K线 (最近 120 根)"""
    df = ak.futures_zh_daily_sina(symbol=symbol)
    if df is None or df.empty:
        raise ValueError(f"日K线返回空: {symbol}")

    df['date'] = pd.to_datetime(df['date'])
    df = df.sort_values('date').tail(120)

    result = []
    for _, row in df.iterrows():
        result.append({
            'date':   row['date'].strftime('%Y-%m-%d'),
            'open':   float(row['open']),
            'high':   float(row['high']),
            'low':    float(row['low']),
            'close':  float(row['close']),
            'volume': int(row['volume']),
            'hold':   int(row['hold']) if ('hold' in row.index and not pd.isna(row['hold'])) else 0
        })
    return result


def fetch_minute(ak, pd, symbol, period='15'):
    """拉取 15 分钟分时线 (最近 40 根)"""
    try:
        df = ak.futures_zh_minute_sina(symbol=symbol, period=period)
        if df is None or df.empty:
            return []

        df['datetime'] = pd.to_datetime(df['datetime'])
        df = df.sort_values('datetime').tail(40)

        result = []
        for _, row in df.iterrows():
            result.append({
                'datetime': row['datetime'].strftime('%Y-%m-%d %H:%M:%S'),
                'open':     float(row['open']),
                'high':     float(row['high']),
                'low':      float(row['low']),
                'close':    float(row['close']),
                'volume':   int(row['volume'])
            })
        return result
    except Exception as e:
        print(f"    [-] 15分钟线拉取失败: {e}")
        return []


def sync_futures():
    print("=" * 65)
    print("  墨子投资 | 智能期货主力合约数据同步系统 v2.1")
    print("  核心策略: 按实时持仓量自动选取当前主力合约")
    print("=" * 65)

    try:
        import akshare as ak
        import pandas as pd
    except ImportError:
        print("[-] 缺少依赖: pip install akshare pandas")
        return False

    now_str = datetime.datetime.now().isoformat()
    contracts_meta = {}
    data_out = {}

    for base_code, cfg in COMMODITY_CFG.items():
        name = cfg['name']
        exchange = cfg['exchange']
        realtime_name = cfg['realtime_name']

        print(f"\n[+] 品种: {name} ({base_code}) @ {exchange}")

        # --- Step 1: 按持仓量查找主力合约 ---
        main_sym, main_oi, main_price = find_main_contract_by_oi(ak, pd, base_code, realtime_name)

        # 决定K线数据源:
        # - 如果OI查询成功 → 用真实主力合约代号（如 CU2607）
        # - 如果失败 → 回退到新浪连续主力合约（如 CU0），这是已知等效于主力的接口
        if main_sym:
            kline_sym = main_sym          # 用具体合约月份拉K线
            display_sym = main_sym
        else:
            kline_sym = f"{base_code}0"   # 回退：连续主力合约
            display_sym = f"{base_code}(主力)"
            print(f"    [回退] 使用连续主力合约: {kline_sym}")

        print(f"    [K线源] {kline_sym}")

        # --- Step 2: 拉取 K线数据 ---
        try:
            daily_list = fetch_daily(ak, pd, kline_sym)
            print(f"    [OK] 日K线: {len(daily_list)} 根")
        except Exception as e:
            print(f"    [-] 日K拉取失败: {e}, 尝试连续主力合约...")
            try:
                fallback_sym = f"{base_code}0"
                daily_list = fetch_daily(ak, pd, fallback_sym)
                kline_sym = fallback_sym
                print(f"    [OK] 日K线(回退): {len(daily_list)} 根")
            except Exception as e2:
                print(f"    [-] 日K彻底失败: {e2}")
                daily_list = []

        min15_list = fetch_minute(ak, pd, kline_sym)
        print(f"    [OK] 15分钟线: {len(min15_list)} 根")

        # --- Step 3: 构建元数据 ---
        contracts_meta[base_code] = {
            'symbol':       display_sym,
            'klineSource':  kline_sym,
            'name':         f"{name}主力",
            'exchange':     exchange,
            'multiplier':   cfg['multiplier'],
            'marginRate':   cfg['margin'],
            'unit':         cfg['unit'],
            'openInterest': main_oi,
            'latestPrice':  main_price
        }

        data_out[base_code] = {
            'daily': daily_list,
            'min15': min15_list
        }

    # --- 汇总输出 JSON ---
    result = {
        'metadata': {
            'sync_time':   now_str,
            'description': '按实时持仓量自动选取主力合约 | Auto-synced by sync_data.py v2.1',
            'contracts':   contracts_meta
        },
        **data_out
    }

    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    os.makedirs(data_dir, exist_ok=True)
    out_path = os.path.join(data_dir, 'futures_data.json')

    try:
        with open(out_path, 'w', encoding='utf-8') as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        print(f"[OK] Sync done! Main contracts by open interest:")
        print(f"{'Code':>4}  {'Symbol':<12}  {'Open Interest':>12}  {'Last Price':>10}")
        print("-" * 45)
        for code, meta in contracts_meta.items():
            oi_str = f"{meta['openInterest']:,}" if meta['openInterest'] else "N/A (fallback)"
            price_str = f"{meta['latestPrice']:.1f}" if meta['latestPrice'] else "N/A"
            print(f"  {code:>4}  {meta['symbol']:<12}  {oi_str:>12}  {price_str:>10}")
        print(f"\n  Data saved to: {out_path}")
        print("=" * 65)
        return True

    except Exception as e:
        print(f"[-] JSON写入失败: {e}")
        return False


if __name__ == '__main__':
    ok = sync_futures()
    sys.exit(0 if ok else 1)
