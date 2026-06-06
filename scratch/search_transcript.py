import json

log_path = r"C:\Users\78432\.gemini\antigravity\brain\82039c95-c97b-46a2-babc-9ff034b15621\.system_generated\logs\transcript.jsonl"

print("Searching transcript for contracts loading logic...")
with open(log_path, 'r', encoding='utf-8') as f:
    for idx, line in enumerate(f):
        if 'anomalies' in line or 'state.contracts' in line or 'Watchlist' in line:
            try:
                data = json.loads(line)
                content = data.get('content', '')
                if any(x in content for x in ['watchlist', 'WATCHLIST', 'anomaly', 'anomalies', 'state.contracts']):
                    print(f"Step {data.get('step_index')}: {content[:200]}...")
            except Exception:
                pass
