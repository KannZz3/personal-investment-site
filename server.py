# -*- coding: utf-8 -*-
"""
==========================================================================
AUTOMATIC LOCAL WEB SERVER LAUNCHER (personal-investment-site/server.py)
==========================================================================
本脚本会自动寻找本地闲置端口，启动静态 HTTP 服务，并自动在默认浏览器中打开小站。
这能完美避开固定端口被占用的情况，且支持错误拦截以防止终端闪退。
"""

import http.server
import socketserver
import webbrowser
import socket
import sys
import os

def find_free_port(start_port=8000):
    """自动寻找从 start_port 开始的第一个闲置端口"""
    for port in range(start_port, start_port + 50):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(('127.0.0.1', port))
                return port
            except socket.error:
                continue
    return None

def start_server():
    # 确保运行工作目录为项目根目录
    project_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(project_dir)
    
    port = find_free_port(8000)
    if not port:
        print("[-] 错误: 无法找到可用的本地端口！已尝试了 8000-8050。")
        input("按回车键退出...")
        sys.exit(1)
        
    # 定义标准 HTTP 请求处理器
    handler = http.server.SimpleHTTPRequestHandler
    
    print("=" * 60)
    print("           墨子投资小站 | 本地静态 HTTP 服务")
    print("=" * 60)
    print(f" [+] 正在启动本地服务器...")
    print(f" [+] 服务地址: http://localhost:{port}")
    print("------------------------------------------------------------")
    print(" 提示: 网页运行期间请勿关闭此命令行窗口。")
    print(" 访问结束后，关闭本窗口或按 Ctrl+C 即可终止服务。")
    print("=" * 60)
    print("正在为您在浏览器中打开页面...")
    
    try:
        # 打开默认浏览器访问对应端口
        webbrowser.open(f"http://localhost:{port}")
    except Exception as e:
        print(f"[-] 自动打开浏览器失败: {e}，请手动访问 http://localhost:{port}")
        
    try:
        # 允许端口重用，快速绑定
        socketserver.TCPServer.allow_reuse_address = True
        with socketserver.TCPServer(('127.0.0.1', port), handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n[+] 服务已手动终止。")
    except Exception as e:
        print(f"\n[-] 服务器运行出错: {e}")
        input("按回车键退出...")

if __name__ == "__main__":
    start_server()
