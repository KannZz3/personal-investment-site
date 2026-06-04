"""Quick test: verify futures_main_sina works for key contracts across all exchanges."""
import akshare as ak
import pandas as pd
from datetime import datetime, timedelta

start = (datetime.now() - timedelta(days=3650)).strftime('%Y%m%d')
COL = ['date','open','high','low','close','volume','hold','ext']

TEST_CODES = [
    # SHFE
    ('AU0','SHFE'), ('CU0','SHFE'), ('AL0','SHFE'), ('ZN0','SHFE'),
    ('RB0','SHFE'), ('HC0','SHFE'), ('BU0','SHFE'), ('RU0','SHFE'), ('SP0','SHFE'),
    ('AG0','SHFE'), ('NI0','SHFE'), ('SN0','SHFE'), ('PB0','SHFE'), ('SS0','SHFE'), ('EB0','SHFE'),
    # DCE
    ('I0','DCE'), ('JM0','DCE'), ('J0','DCE'), ('C0','DCE'), ('M0','DCE'),
    ('Y0','DCE'), ('P0','DCE'), ('V0','DCE'), ('L0','DCE'), ('PP0','DCE'),
    ('EG0','DCE'), ('PG0','DCE'), ('A0','DCE'), ('CS0','DCE'), ('JD0','DCE'), ('LH0','DCE'),
    # CZCE
    ('SR0','CZCE'), ('CF0','CZCE'), ('TA0','CZCE'), ('MA0','CZCE'), ('FG0','CZCE'),
    ('OI0','CZCE'), ('RM0','CZCE'), ('SA0','CZCE'), ('ZC0','CZCE'), ('UR0','CZCE'),
    ('AP0','CZCE'), ('SF0','CZCE'), ('SM0','CZCE'), ('CJ0','CZCE'),
    # INE
    ('SC0','INE'), ('LU0','INE'), ('NR0','INE'),
    # GFEX
    ('SI0','GFEX'), ('LC0','GFEX'),
]

print(f"{'Symbol':<8} {'Exch':<6} {'Rows':>6} {'Date Range':>22} {'Hist Max OI':>12} {'Curr OI':>10} Status")
print('-' * 80)
ok, fail = 0, 0
for sym, exch in TEST_CODES:
    try:
        df = ak.futures_main_sina(symbol=sym, start_date=start)
        if df is None or df.empty:
            print(f"{sym:<8} {exch:<6} {'NO DATA':>6}")
            fail += 1
            continue
        df.columns = COL[:len(df.columns)]
        df['hold'] = pd.to_numeric(df['hold'], errors='coerce').fillna(0)
        df_nonzero = df[df['hold'] > 0]
        hist_max = int(df_nonzero['hold'].max()) if not df_nonzero.empty else 0
        curr = int(df.iloc[-1]['hold'])
        ratio = curr/hist_max if hist_max > 0 else 0
        alert = 'NEW_HIGH' if curr > hist_max else ('NEAR_HIGH' if ratio >= 0.9 else 'normal')
        date_range = f"{str(df['date'].min())[:10]} ~ {str(df['date'].max())[:10]}"
        print(f"{sym:<8} {exch:<6} {len(df):>6} {date_range:>22} {hist_max:>12,} {curr:>10,}  {alert}")
        ok += 1
    except Exception as e:
        print(f"{sym:<8} {exch:<6} ERROR: {str(e)[:50]}")
        fail += 1

print(f"\nResult: {ok} OK, {fail} failed")
