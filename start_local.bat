@echo off
chcp 65001 >nul
title 墨子投资小站 - 本地服务器启动器
cls
echo ============================================================
echo           墨子投资小站 ^| 本地服务一键启动工具
echo ============================================================
echo.

:: Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [-] 错误: 系统未检测到 Python。请先安装 Python 并添加到系统 PATH 环境变量中。
    echo.
    pause
    exit /b
)

:: Option to sync data first
echo [?] 是否需要在启动前同步最新的国内商品期货数据？(y/n)
set /p sync_choice="输入选择 (默认 n): "

if /i "%sync_choice%"=="y" (
    echo.
    echo [+] 正在尝试同步真实行情数据...
    python sync_data.py
    echo.
)

echo [+] 正在启动本地服务器...
python server.py

