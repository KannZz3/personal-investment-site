import json

log_path = r"C:\Users\78432\.gemini\antigravity\brain\82039c95-c97b-46a2-babc-9ff034b15621\.system_generated\logs\transcript.jsonl"

print("Searching for instructions on watchlist vs anomalies...")
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if 'USER_INPUT' in data.get('type', ''):
                if any(x in content for x in ['watchlist', 'WATCHLIST', 'anomaly', 'anomalies', '自选', '异动', '看板']):
                    print(f"Step {data.get('step_index')}: {content}")
        except Exception:
            pass
