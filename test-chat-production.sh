#!/bin/bash

# Script para probar el chat en producción
# BingoRoyal - Sistema de Chat

echo "🧪 PROBANDO CHAT EN PRODUCCIÓN"
echo "=============================="

# Configuración
PRODUCTION_URL="https://game.bingoroyal.es"
EC2_URL="http://52.212.178.26:3000"

echo "🌐 URL de Producción: $PRODUCTION_URL"
echo "🖥️  URL del Servidor: $EC2_URL"
echo ""

# Función para hacer request HTTP
make_request() {
    local url=$1
    local endpoint=$2
    local method=${3:-GET}
    local data=${4:-""}
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl -s -X POST "$url$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s "$url$endpoint"
    fi
}

echo "📋 PRUEBA 1: Verificar dominio de producción..."
main_page=$(make_request "$PRODUCTION_URL" "/")
if echo "$main_page" | grep -q "BingoRoyal"; then
    echo "✅ Dominio de producción: FUNCIONANDO"
else
    echo "❌ Dominio de producción: NO RESPONDE"
    exit 1
fi

echo ""
echo "📋 PRUEBA 2: Verificar scripts del chat en producción..."
echo "   Verificando chat-config.js..."
if make_request "$PRODUCTION_URL" "/chat-config.js" | grep -q "ChatConfig"; then
    echo "✅ chat-config.js: DISPONIBLE en producción"
else
    echo "❌ chat-config.js: NO DISPONIBLE en producción"
fi

echo "   Verificando advanced-chat-system.js..."
if make_request "$PRODUCTION_URL" "/advanced-chat-system.js" | grep -q "AdvancedChatSystem"; then
    echo "✅ advanced-chat-system.js: DISPONIBLE en producción"
else
    echo "❌ advanced-chat-system.js: NO DISPONIBLE en producción"
fi

echo "   Verificando test-chat.js..."
if make_request "$PRODUCTION_URL" "/test-chat.js" | grep -q "ChatTester"; then
    echo "✅ test-chat.js: DISPONIBLE en producción"
else
    echo "❌ test-chat.js: NO DISPONIBLE en producción"
fi

echo ""
echo "📋 PRUEBA 3: Verificar API del chat en producción..."
chat_api=$(make_request "$PRODUCTION_URL" "/api/chat")
if echo "$chat_api" | grep -q "success.*true"; then
    echo "✅ API del chat en producción: FUNCIONANDO"
    echo "   Mensajes disponibles: $(echo "$chat_api" | grep -o '"message":"[^"]*"' | wc -l)"
else
    echo "❌ API del chat en producción: NO FUNCIONA"
    echo "   Respuesta: $chat_api"
fi

echo ""
echo "📋 PRUEBA 4: Verificar página de debugging en producción..."
debug_page=$(make_request "$PRODUCTION_URL" "/chat-debug-enhanced.html")
if echo "$debug_page" | grep -q "Chat Debug Enhanced"; then
    echo "✅ Página de debugging en producción: DISPONIBLE"
else
    echo "❌ Página de debugging en producción: NO DISPONIBLE"
fi

echo ""
echo "📋 PRUEBA 5: Verificar envío de mensaje en producción..."
test_message='{"message":"Mensaje de prueba desde script de producción","userId":"test_user","userName":"TestUser"}'
chat_response=$(make_request "$PRODUCTION_URL" "/api/chat" "POST" "$test_message")
if echo "$chat_response" | grep -q "success.*true"; then
    echo "✅ Envío de mensaje en producción: FUNCIONANDO"
else
    echo "❌ Envío de mensaje en producción: NO FUNCIONA"
    echo "   Respuesta: $chat_response"
fi

echo ""
echo "📋 PRUEBA 6: Verificar redirección del servidor..."
echo "   Verificando redirección desde IP directa..."
redirect_response=$(curl -s -I "$EC2_URL/chat-config.js" | grep -i "location\|redirect")
if echo "$redirect_response" | grep -q "game.bingoroyal.es"; then
    echo "✅ Redirección del servidor: FUNCIONANDO"
    echo "   Redirige a: $redirect_response"
else
    echo "❌ Redirección del servidor: NO FUNCIONA"
fi

echo ""
echo "🎯 RESUMEN DE PRUEBAS EN PRODUCCIÓN:"
echo "===================================="
echo "🌐 URL de Producción: $PRODUCTION_URL"
echo "🔧 Página de debugging: $PRODUCTION_URL/chat-debug-enhanced.html"
echo "💬 API del chat: $PRODUCTION_URL/api/chat"
echo ""
echo "📱 Para probar manualmente:"
echo "   1. Abre $PRODUCTION_URL en tu navegador"
echo "   2. Inicia sesión o regístrate"
echo "   3. Verifica que el chat funcione"
echo "   4. Usa $PRODUCTION_URL/chat-debug-enhanced.html para debugging"
echo ""
echo "🔍 URLs de prueba:"
echo "   - Página principal: $PRODUCTION_URL"
echo "   - Chat config: $PRODUCTION_URL/chat-config.js"
echo "   - Chat system: $PRODUCTION_URL/advanced-chat-system.js"
echo "   - Chat tester: $PRODUCTION_URL/test-chat.js"
echo "   - Debug page: $PRODUCTION_URL/chat-debug-enhanced.html"
echo "   - Chat API: $PRODUCTION_URL/api/chat"
echo ""
echo "✅ Pruebas en producción completadas!"
