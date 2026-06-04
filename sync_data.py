# -*- coding: utf-8 -*-
"""
==========================================================================
CHINESE COMMODITY FUTURES DATA SYNC PIPELINE (personal-investment-site/sync_data.py)
==========================================================================
说明：
1. 本脚本使用 AkShare 库抓取国内商品期货主连合约行情（包括日K线与15分钟分时线）。
2. 抓取的数据会被清洗并转换为前端可直接解析的 JSON 格式。
3. 导出的 JSON 将保存在本地项目 data/futures_data.json 目录，前端检测到后将无缝切换为真实行情。

运行依赖：
pip install akshare pandas

运行命令：
python sync_data.py
"""

import os
import json
import datetime
import sys

# Define contract mappings: Frontend Key -> Sina Futures Symbol
# We map frontend symbols to Sina Continuous Main Contracts (e.g. AU0, CU0) 
# to guarantee persistent active liquidity stream.
SYMBOL_MAP = {
    'AU2606': {'sina_symbol': 'AU0', 'name': '沪金主力'},
    'CU2607': {'sina_symbol': 'CU0', 'name': '沪铜主力'},
    'RB2610': {'sina_symbol': 'RB0', 'name': '螺纹主力'},
    'SC2607': {'sina_symbol': 'SC0', 'name': '原油主力'},
    'SR2609': {'sina_symbol': 'SR0', 'name': '白糖主力'},
    'TA2609': {'sina_symbol': 'TA0', 'name': 'PTA主力'}
}

def sync_futures():
    print("=" * 60)
    print(" 墨子投资期货数据同步管道 (AkShare -> JSON) ")
    print("=" * 60)
    
    # 1. Check dependency installs
    try:
        import akshare as ak
        import pandas as pd
    except ImportError:
        print("[-] 错误: 本地环境未检测到 akshare 或 pandas 库。")
        print("    请运行以下命令进行安装:")
        print("    pip install akshare pandas")
        return False

    now_str = datetime.datetime.now().isoformat()
    result_data = {
        "metadata": {
            "sync_time": now_str,
            "description": "Synced via AkShare from Sina Finance API"
        }
    }

    # 2. Iterate each contract mapping
    for frontend_key, meta in SYMBOL_MAP.items():
        sina_sym = meta['sina_symbol']
        name = meta['name']
        print(f"[+] 正在抓取 {name} (新浪代码: {sina_sym})...")
        
        try:
            # A. Fetch Daily K-line
            # Sina daily API returns whole historical dataframe
            df_daily = ak.futures_zh_daily_sina(symbol=sina_sym)
            if df_daily.empty:
                raise ValueError("Returned daily dataframe is empty")
            
            # Sort chronologically and take last 120 trading days
            df_daily['date'] = pd.to_datetime(df_daily['date'])
            df_daily = df_daily.sort_values('date').tail(120)
            
            # Format daily rows to JSON compatible list
            daily_list = []
            for _, row in df_daily.iterrows():
                daily_list.append({
                    "date": row['date'].strftime('%Y-%m-%d'),
                    "open": float(row['open']),
                    "high": float(row['high']),
                    "low": float(row['low']),
                    "close": float(row['close']),
                    "volume": int(row['volume']),
                    "hold": int(row['hold']) if 'hold' in row and not pd.isna(row['hold']) else 0
                })
                
            # B. Fetch 15 Minute Intraday K-line
            # Sina minute API returns recent periods
            df_min = ak.futures_zh_minute_sina(symbol=sina_sym, period="15")
            min_list = []
            
            if not df_min.empty:
                df_min['datetime'] = pd.to_datetime(df_min['datetime'])
                df_min = df_min.sort_values('datetime').tail(40)
                for _, row in df_min.iterrows():
                    min_list.append({
                        "datetime": row['datetime'].strftime('%Y-%m-%d %H:%M:%S'),
                        "open": float(row['open']),
                        "high": float(row['high']),
                        "low": float(row['low']),
                        "close": float(row['close']),
                        "volume": int(row['volume'])
                    })
            else:
                print(f"    [-] 提示: {sina_sym} 15分钟分时数据暂空，将仅保存日K线")

            # Store inside output dict
            result_data[frontend_key] = {
                "daily": daily_list,
                "min15": min_list
            }
            print(f"    [OK] 抓取完成: 日K {len(daily_list)} 行, 15分钟线 {len(min_list)} 行")
            
        except Exception as e:
            print(f"    [-] 抓取 {name} ({sina_sym}) 失败! 详情: {e}")
            # Keep empty arrays as fallback
            result_data[frontend_key] = {"daily": [], "min15": []}

    # 3. Create destination directory
    data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    if not os.path.exists(data_dir):
        os.makedirs(data_dir)
        print(f"[+] 创建本地数据目录: {data_dir}")

    # 4. Save file as json
    output_file = os.path.join(data_dir, 'futures_data.json')
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result_data, f, ensure_ascii=False, indent=2)
        print("=" * 60)
        print(f"[OK] 成功！所有商品期货行情已打包同步至:")
        print(f"    {output_file}")
        print("=" * 60)
        return True
    except Exception as e:
        print(f"[-] 保存 JSON 文件失败: {e}")
        return False

if __name__ == "__main__":
    success = sync_futures()
    sys.exit(0 if success else 1)
