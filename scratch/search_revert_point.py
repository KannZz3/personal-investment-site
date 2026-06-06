# -*- coding: utf-8 -*-
import json
log_path = r"C:\Users\78432\.gemini\antigravity\brain\82039c95-c97b-46a2-babc-9ff034b15621\.system_generated\logs\transcript.jsonl"
with open(log_path, 'r', encoding='utf-8') as f:
    for line in f:
        try:
            data = json.loads(line)
            content = data.get('content', '')
            if '现在开始对目前最新版本的ui项目' in content:
                print(f"Step {data.get('step_index')}: {content[:300]}...")
        except Exception as e:
            pass
