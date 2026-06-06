import os

project_dir = r"c:\Users\78432\OneDrive\桌面\personal-investment-site"

search_terms = ["常规合约", "异常扫描", "Watchlist 自选", "自选合约与异动合约"]

for root, dirs, files in os.walk(project_dir):
    if '.git' in root or '__pycache__' in root:
        continue
    for file in files:
        if file.endswith(('.html', '.js', '.py', '.css')):
            path = os.path.join(root, file)
            try:
                with open(path, 'r', encoding='utf-8') as f:
                    for line_idx, line in enumerate(f, 1):
                        for term in search_terms:
                            if term in line:
                                print(f"{file}:{line_idx}: {line.strip()}")
            except Exception as e:
                pass
