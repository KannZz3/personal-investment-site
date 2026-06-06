import akshare as ak
import pandas as pd

try:
    df = ak.futures_zh_realtime(symbol="螺纹钢")
    print(df[['symbol', 'name', 'position', 'trade', 'open', 'high', 'low']])
except Exception as e:
    print(f"Error: {e}")
