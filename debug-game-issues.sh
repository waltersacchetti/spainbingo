#!/bin/bash

echo "🔍 DIAGNÓSTICO DE PROBLEMAS DEL JUEGO"
echo "====================================="

SERVER_URL="http://52.212.178.26:3000"

echo ""
echo "1️⃣ Verificando si el servidor responde..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$SERVER_URL/"

echo ""
echo "2️⃣ Verificando si la página del juego carga..."
curl -s -o /dev/null -w "Status: %{http_code}\n" "$SERVER_URL/game"

echo ""
echo "3️⃣ Verificando archivos JavaScript críticos..."
curl -s -o /dev/null -w "script.js: %{http_code}\n" "$SERVER_URL/script.js"
curl -s -o /dev/null -w "styles.css: %{http_code}\n" "$SERVER_URL/styles.css"

echo ""
echo "4️⃣ Verificando APIs del juego..."
echo "API de números:"
curl -s "$SERVER_URL/api/game/numbers" | jq '.' 2>/dev/null || echo "Error en API de números"

echo ""
echo "5️⃣ Verificando elementos críticos en el HTML..."
echo "Buscando elementos del juego:"
curl -s "$SERVER_URL/game" | grep -i "gameCountdown\|calledNumbers\|lastNumber" | head -5

echo ""
echo "6️⃣ Verificando inicialización del juego en script.js..."
echo "Buscando funciones de inicialización:"
grep -n "startGameScheduler\|startNewGame\|startAutoCalling" public/script.js

echo ""
echo "7️⃣ Verificando event listeners..."
echo "Buscando event delegation:"
grep -n "document\.addEventListener.*click" public/script.js | head -3

echo ""
echo "8️⃣ Verificando variables globales..."
echo "Buscando window.bingoGame:"
grep -n "window\.bingoGame" public/script.js

echo ""
echo "✅ Diagnóstico completado"
echo ""
echo "🔧 POSIBLES PROBLEMAS:"
echo "1. El juego no se inicializa correctamente"
echo "2. Los event listeners no se configuran"
echo "3. El scheduler no se inicia"
echo "4. Hay errores JavaScript en la consola"
echo "5. El DOM no se carga completamente"
echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Abrir consola del navegador (F12)"
echo "2. Verificar si hay errores JavaScript"
echo "3. Verificar si window.bingoGame existe"
echo "4. Verificar si el countdown se actualiza"
echo "5. Verificar si los event listeners funcionan" 