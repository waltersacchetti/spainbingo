#!/bin/bash

echo "🎮 MONITOREO DEL BINGO GLOBAL"
echo "=============================="

SERVER_URL="http://52.212.178.26:3000"

echo ""
echo "1️⃣ Verificando estado del servidor..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$SERVER_URL/game"

echo ""
echo "2️⃣ Verificando APIs del juego..."

echo "API de números del juego:"
curl -s "$SERVER_URL/api/game/numbers" | jq '.numbers | length' 2>/dev/null || echo "API no disponible"

echo ""
echo "3️⃣ Verificando logs del servidor..."
echo "Últimos logs de PM2:"
ssh -i spainbingo-key.pem ec2-user@52.212.178.26 "pm2 logs spainbingo --lines 10" 2>/dev/null || echo "No se pueden obtener logs"

echo ""
echo "4️⃣ Verificando estado de PM2..."
ssh -i spainbingo-key.pem ec2-user@52.212.178.26 "pm2 status" 2>/dev/null || echo "No se puede verificar PM2"

echo ""
echo "5️⃣ Verificando archivos en el servidor..."
ssh -i spainbingo-key.pem ec2-user@52.212.178.26 "ls -la /home/ec2-user/public/ | head -5" 2>/dev/null || echo "No se puede verificar archivos"

echo ""
echo "✅ Monitoreo completado"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Abrir la página del juego en el navegador"
echo "2. Verificar si el countdown está funcionando"
echo "3. Esperar a que inicie una partida automática"
echo "4. Verificar si los números se llaman automáticamente"
echo "5. Verificar si los números se reflejan en los cartones" 