import json

log_path = r"C:\Users\78432\.gemini\antigravity\brain\82039c95-c97b-46a2-babc-9ff034b15621\.system_generated\logs\transcript.jsonl"

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        if 'state.contracts =' in line or 'state.contracts =' in line:
            try:
                data = json.loads(line)
                print(f"Step {data.get('step_index')}: {data.get('content', '')[:300]}")
            except Exception:
                pass
