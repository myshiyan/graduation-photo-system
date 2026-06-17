@echo off
chcp 65001 >nul
title 毕业合影姓名校对管理系统 - 启动
echo ============================================
echo   毕业合影姓名校对管理系统
echo   正在启动服务...
echo ============================================
echo.

cd /d "%~dp0"

rem 检查是否已在运行
pm2 list 2>nul | findstr /C:"graduation-photo" >nul
if %errorlevel%==0 (
    echo [提示] 系统已在运行，正在重启...
    pm2 restart graduation-photo
) else (
    rem 启动系统（--name 设置进程名，--watch 自动重启，--no-daemon 不守护）
    pm2 start server.js --name graduation-photo --time
)

echo.
echo [完成] 系统已启动
echo.
echo   本机访问:   http://localhost:3000
echo   局域网访问: http://192.168.1.12:3000
echo.
echo 常用命令:
echo   查看状态: pm2 status
echo   查看日志: pm2 logs graduation-photo
echo   停止系统: pm2 stop graduation-photo
echo   重启系统: pm2 restart graduation-photo
echo.
pause
