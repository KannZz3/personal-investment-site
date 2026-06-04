import akshare as ak
import pandas as pd
from datetime import datetime, timedelta

ten_years_ago = (datetime.now() - timedelta(days=3650)).strftime('%Y%m%d')
COL = ['date', 'open', 'high', 'low', 'close', 'volume', 'hold', 'oi']

symbols = [
    ('AU', '沪金', 'AU0'),
    ('CU', '沪铜', 'CU0'),
    ('RB', '螺纹钢', 'RB0'),
    ('SC', '原油', 'SC0'),
    ('SR', '白糖', 'SR0'),
    ('TA', 'PTA', 'TA0'),
]

# Also check current OI from realtime
realtime_names = {'AU': '黄金', 'CU': '沪铜', 'RB': '螺纹钢', 'SC': '原油', 'SR': '白糖', 'TA': 'PTA'}

print(f"{'Code':4} {'Contract':12} {'Hist Max OI':>12} {'Hist Max Date':15} {'Curr OI':>10} {'Ratio':>8} {'Status':15}")
print('-' * 90)

for base, name, cont_sym in symbols:
    try:
        df = ak.futures_main_sina(symbol=cont_sym, start_date=ten_years_ago)
        df.columns = COL
        df['hold'] = pd.to_numeric(df['hold'], errors='coerce').fillna(0)
        hist_max = int(df['hold'].max())
        hist_date = str(df.loc[df['hold'].idxmax(), 'date'])
        
        # Get current OI
        rdf = ak.futures_zh_realtime(symbol=realtime_names[base])
        rdf_real = rdf[~rdf['symbol'].str.endswith('0')].copy()
        rdf_real['position'] = pd.to_numeric(rdf_real['position'], errors='coerce').fillna(0)
        main_row = rdf_real.loc[rdf_real['position'].idxmax()]
        curr_sym = main_row['symbol']
        curr_oi = int(main_row['position'])
        
        ratio = curr_oi / hist_max if hist_max > 0 else 0
        status = 'NEW HIGH (b)' if curr_oi > hist_max else ('NEAR HIGH >=90% (a)' if ratio >= 0.9 else 'normal')
        
        print(f"{base:4} {curr_sym:12} {hist_max:>12,} {hist_date:15} {curr_oi:>10,} {ratio:>8.2%} {status}")
    except Exception as e:
        print(f"{base:4} ERROR: {e}")
