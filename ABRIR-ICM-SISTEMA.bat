@echo off
title ICM Sistema - servidor local (nao feche esta janela)
cd /d "%~dp0"
echo.
echo  ICM Sistema rodando em http://localhost:5510
echo  Deixe esta janela aberta enquanto usa o sistema.
echo.
start "" http://localhost:5510
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0tools\serve.ps1" -Port 5510
