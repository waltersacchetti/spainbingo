#!/bin/bash

echo "🎮 DIAGNÓSTICO DE FUNCIONALIDADES DEL JUEGO"
echo "=========================================="

# Configuración
SERVER_URL="http://52.212.178.26:3000"

echo ""
echo "1️⃣ Probando acceso a la página principal..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$SERVER_URL/game"

echo ""
echo "2️⃣ Probando API de chat..."
curl -s -X POST "$SERVER_URL/api/chat" \
  -H "Content-Type: application/json" \
  -d '{"message": "ayuda", "userId": "test"}' | jq '.success'

echo ""
echo "3️⃣ Probando archivos estáticos..."
curl -s -o /dev/null -w "script.js: %{http_code}\n" "$SERVER_URL/script.js"
curl -s -o /dev/null -w "styles.css: %{http_code}\n" "$SERVER_URL/styles.css"

echo ""
echo "4️⃣ Verificando elementos del DOM..."
echo "Buscando elementos críticos en index.html..."

# Buscar elementos importantes en el HTML
echo "Chat input:"
grep -n "chatInput" public/index.html

echo ""
echo "Botones del juego:"
grep -n "btn-" public/index.html | head -5

echo ""
echo "5️⃣ Verificando event listeners en script.js..."
echo "Event listeners del chat:"
grep -n "addEventListener.*keypress\|addEventListener.*click" public/script.js | head -5

echo ""
echo "6️⃣ Verificando inicialización del juego..."
echo "BingoGame initialization:"
grep -n "window\.bingoGame\|new BingoPro" public/script.js

echo ""
echo "✅ Diagnóstico completado"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Revisar la consola del navegador para errores JavaScript"
echo "2. Verificar si los event listeners se configuran correctamente"
echo "3. Comprobar si window.bingoGame se inicializa"
echo "4. Probar la funcionalidad del chat en el navegador" 