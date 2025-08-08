#!/bin/bash

echo "🎮 DIAGNÓSTICO ESPECÍFICO DEL JUEGO"
echo "=================================="

# Configuración
SERVER_URL="http://52.212.178.26:3000"

echo ""
echo "1️⃣ Probando APIs del juego..."

echo "API de números del juego:"
curl -s "$SERVER_URL/api/game/numbers" | jq '.' 2>/dev/null || echo "API no disponible"

echo ""
echo "2️⃣ Verificando elementos críticos del DOM..."

echo "Botones del juego:"
grep -n "btn-call\|btn-auto\|btn-new-game" public/index.html

echo ""
echo "3️⃣ Verificando funciones críticas en script.js..."

echo "Función callNumber:"
grep -n "callNumber()" public/index.html

echo ""
echo "Event listeners del juego:"
grep -n "btn-call\|btn-auto\|btn-new-game" public/script.js

echo ""
echo "4️⃣ Verificando inicialización del juego..."
echo "Game state management:"
grep -n "gameState.*playing\|gameState.*waiting" public/script.js

echo ""
echo "5️⃣ Verificando renderizado de cartones..."
echo "Render cards function:"
grep -n "renderCards\|renderCardGrid" public/script.js

echo ""
echo "6️⃣ Verificando marcado de números..."
echo "Number marking logic:"
grep -n "calledNumbers\.has\|isMarked" public/script.js

echo ""
echo "7️⃣ Verificando event delegation..."
echo "Event delegation setup:"
grep -A 10 -B 5 "document\.addEventListener.*click" public/script.js

echo ""
echo "✅ Diagnóstico completado"
echo ""
echo "🔍 PRÓXIMOS PASOS DE DEBUGGING:"
echo "1. Abrir consola del navegador (F12)"
echo "2. Ir a la página del juego"
echo "3. Verificar si hay errores JavaScript"
echo "4. Probar hacer clic en botones del juego"
echo "5. Verificar si window.bingoGame está disponible"
echo "6. Verificar si gameState es 'playing'"
echo "7. Probar función callNumber() manualmente" 