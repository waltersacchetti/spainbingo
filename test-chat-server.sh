#!/bin/bash

# Script para probar el chat en el servidor desplegado
# BingoRoyal - Sistema de Chat

echo "🧪 PROBANDO CHAT EN EL SERVIDOR DESPLEGADO"
echo "=========================================="

# Configuración
SERVER_IP="52.212.178.26"
SERVER_PORT="3000"
BASE_URL="http://$SERVER_IP:$SERVER_PORT"

echo "🌐 Servidor: $BASE_URL"
echo ""

# Función para hacer request HTTP
make_request() {
    local endpoint=$1
    local method=${2:-GET}
    local data=${3:-""}
    
    if [ "$method" = "POST" ] && [ -n "$data" ]; then
        curl -s -X POST "$BASE_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data"
    else
        curl -s "$BASE_URL$endpoint"
    fi
}

# Función para mostrar resultado
show_result() {
    local test_name=$1
    local result=$2
    local expected=$3
    
    if echo "$result" | grep -q "$expected"; then
        echo "✅ $test_name: PASÓ"
    else
        echo "❌ $test_name: FALLÓ"
        echo "   Resultado: $result"
    fi
}

echo "📋 PRUEBA 1: Verificar que la aplicación esté funcionando..."
main_page=$(make_request "/")
if [ -n "$main_page" ]; then
    echo "✅ Aplicación principal: FUNCIONANDO"
else
    echo "❌ Aplicación principal: NO RESPONDE"
    exit 1
fi

echo ""
echo "📋 PRUEBA 2: Verificar API del chat..."
chat_api=$(make_request "/api/chat")
if echo "$chat_api" | grep -q "success.*true"; then
    echo "✅ API del chat: FUNCIONANDO"
    echo "   Mensajes disponibles: $(echo "$chat_api" | grep -o '"message":"[^"]*"' | wc -l)"
else
    echo "❌ API del chat: NO FUNCIONA"
    echo "   Respuesta: $chat_api"
fi

echo ""
echo "📋 PRUEBA 3: Verificar archivos del chat..."
echo "   Verificando chat-config.js..."
if make_request "/chat-config.js" | grep -q "ChatConfig"; then
    echo "✅ chat-config.js: DISPONIBLE"
else
    echo "❌ chat-config.js: NO DISPONIBLE"
fi

echo "   Verificando advanced-chat-system.js..."
if make_request "/advanced-chat-system.js" | grep -q "AdvancedChatSystem"; then
    echo "✅ advanced-chat-system.js: DISPONIBLE"
else
    echo "❌ advanced-chat-system.js: NO DISPONIBLE"
fi

echo "   Verificando chat-test.js..."
if make_request "/chat-test.js" | grep -q "ChatTester"; then
    echo "✅ chat-test.js: DISPONIBLE"
else
    echo "❌ chat-test.js: NO DISPONIBLE"
fi

echo ""
echo "📋 PRUEBA 4: Verificar página de debugging..."
debug_page=$(make_request "/chat-debug-enhanced.html")
if echo "$debug_page" | grep -q "Chat Debug Enhanced"; then
    echo "✅ Página de debugging: DISPONIBLE"
else
    echo "❌ Página de debugging: NO DISPONIBLE"
fi

echo ""
echo "📋 PRUEBA 5: Verificar envío de mensaje..."
test_message='{"message":"Mensaje de prueba desde script","userId":"test_user","userName":"TestUser"}'
chat_response=$(make_request "/api/chat" "POST" "$test_message")
if echo "$chat_response" | grep -q "success.*true"; then
    echo "✅ Envío de mensaje: FUNCIONANDO"
else
    echo "❌ Envío de mensaje: NO FUNCIONA"
    echo "   Respuesta: $chat_response"
fi

echo ""
echo "📋 PRUEBA 6: Verificar estado del servidor..."
server_status=$(ssh -i spainbingo-key.pem -o ConnectTimeout=10 ec2-user@$SERVER_IP "pm2 status bingoroyal" 2>/dev/null)
if echo "$server_status" | grep -q "online"; then
    echo "✅ Servidor PM2: FUNCIONANDO"
else
    echo "❌ Servidor PM2: NO FUNCIONA"
fi

echo ""
echo "🎯 RESUMEN DE PRUEBAS:"
echo "======================"
echo "🌐 URL del servidor: $BASE_URL"
echo "🔧 Página de debugging: $BASE_URL/chat-debug-enhanced.html"
echo "💬 API del chat: $BASE_URL/api/chat"
echo ""
echo "📱 Para probar manualmente:"
echo "   1. Abre $BASE_URL en tu navegador"
echo "   2. Inicia sesión o regístrate"
echo "   3. Verifica que el chat funcione"
echo "   4. Usa $BASE_URL/chat-debug-enhanced.html para debugging"
echo ""
echo "✅ Pruebas completadas!"
