@echo off
REM Instala o Agente de Inventario de TI - executar como Administrador
REM Deixe este arquivo na mesma pasta do agente-inventario.exe
"%~dp0agente-inventario.exe" instalar -servidor https://sistema-inventario-kohl.vercel.app -token 8u2maP4wzKIQbaTvf7onE_3scwWj1y2f
pause
