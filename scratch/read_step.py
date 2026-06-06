import json

log_path = r"C:\Users\78432\.gemini\antigravity\brain\82039c95-c97b-46a2-babc-9ff034b15621\.system_generated\logs\transcript.jsonl"

steps_to_read = [2858, 2862, 2893, 2895]

with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            step = data.get('step_index')
            if step in steps_to_read:
                print(f"=== STEP {step} ===")
                print(data.get('content', '')[:1000])
                if 'tool_calls' in data:
                    print(json.dumps(data['tool_calls'], indent=2, ensure_ascii=False)[:1000])
        except Exception as e:
            pass
