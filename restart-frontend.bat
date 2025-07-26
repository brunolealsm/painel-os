@echo off
echo ========================================
echo REINICIANDO FRONTEND COM NOVAS CONFIGURACOES
echo ========================================
echo.

echo Parando servidor frontend atual...
taskkill /f /im node.exe 2>nul
timeout /t 2 /nobreak >nul

echo.
echo Iniciando servidor frontend com proxy configurado...
echo Proxy: http://localhost:3002
echo.

npm start

pause 