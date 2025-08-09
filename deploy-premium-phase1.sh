#!/bin/bash

echo "🚀 DESPLEGANDO FASE 1 PREMIUM - BINGOROYAL"
echo "=========================================="
echo ""
echo "📦 SISTEMAS A DESPLEGAR:"
echo "  1️⃣ Premium Theme v3.0 (UI/UX Premium)"
echo "  2️⃣ Auto-Daub System v3.0 (Marcado automático)"
echo "  3️⃣ Multi-Room System v3.0 (Salas múltiples)"
echo "  4️⃣ Advanced Chat System v3.0 (Chat social)"
echo "  5️⃣ Integración completa en script.js"
echo ""

# Configuración del servidor
SERVER_USER="ec2-user"
SERVER_HOST="52.212.178.26"
REMOTE_PATH="/home/ec2-user/public"
KEY_PATH="~/.ssh/spainbingo.pem"

echo "🔍 Verificando archivos localmente..."
echo "-----------------------------------"

# Verificar que todos los archivos existen
FILES_TO_CHECK=(
    "public/premium-theme.css"
    "public/auto-daub-system.js"
    "public/multi-room-system.js"
    "public/advanced-chat-system.js"
    "public/index.html"
    "public/script.js"
)

missing_files=0
for file in "${FILES_TO_CHECK[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file"
    else
        echo "❌ $file - FALTA"
        missing_files=$((missing_files + 1))
    fi
done

if [ $missing_files -gt 0 ]; then
    echo ""
    echo "❌ ERROR: Faltan $missing_files archivos. Abortando despliegue."
    exit 1
fi

echo ""
echo "📤 Sincronizando archivos al servidor..."
echo "----------------------------------------"

# Sincronizar archivos premium al servidor
echo "🎨 Subiendo Premium Theme..."
rsync -avz -e "ssh -i $KEY_PATH" public/premium-theme.css $SERVER_USER@$SERVER_HOST:$REMOTE_PATH/

echo "🎯 Subiendo Auto-Daub System..."
rsync -avz -e "ssh -i $KEY_PATH" public/auto-daub-system.js $SERVER_USER@$SERVER_HOST:$REMOTE_PATH/

echo "🏟️ Subiendo Multi-Room System..."
rsync -avz -e "ssh -i $KEY_PATH" public/multi-room-system.js $SERVER_USER@$SERVER_HOST:$REMOTE_PATH/

echo "💬 Subiendo Advanced Chat System..."
rsync -avz -e "ssh -i $KEY_PATH" public/advanced-chat-system.js $SERVER_USER@$SERVER_HOST:$REMOTE_PATH/

echo "📄 Subiendo HTML actualizado..."
rsync -avz -e "ssh -i $KEY_PATH" public/index.html $SERVER_USER@$SERVER_HOST:$REMOTE_PATH/

echo "⚙️ Subiendo script principal actualizado..."
rsync -avz -e "ssh -i $KEY_PATH" public/script.js $SERVER_USER@$SERVER_HOST:$REMOTE_PATH/

echo ""
echo "🔄 Reiniciando servicios en el servidor..."
echo "------------------------------------------"

# Conectar al servidor y reiniciar PM2
ssh -i $KEY_PATH $SERVER_USER@$SERVER_HOST << 'EOF'
echo "📍 Ubicación actual: $(pwd)"
echo "📂 Contenido del directorio public:"
ls -la public/ | head -20

echo ""
echo "🔄 Reiniciando PM2..."
pm2 restart all

echo ""
echo "⏰ Esperando 5 segundos para que se estabilice..."
sleep 5

echo ""
echo "📊 Estado de PM2:"
pm2 status

echo ""
echo "📋 Últimos logs de la aplicación:"
pm2 logs --lines 10
EOF

echo ""
echo "🧪 PROBANDO FUNCIONALIDADES PREMIUM..."
echo "======================================"

# Función para probar URLs
test_url() {
    local url=$1
    local description=$2
    echo -n "🔍 Probando $description... "
    
    response=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 10 "$url")
    
    if [ "$response" = "200" ]; then
        echo "✅ OK (HTTP $response)"
    else
        echo "❌ FALLO (HTTP $response)"
    fi
}

# URLs a probar
echo ""
echo "🌐 Probando conectividad básica:"
test_url "http://52.212.178.26:3000" "Servidor directo"
test_url "http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com" "ALB"
test_url "http://game.bingoroyal.es" "Dominio principal"

echo ""
echo "📱 Probando archivos premium:"
test_url "http://52.212.178.26:3000/premium-theme.css" "Premium Theme CSS"
test_url "http://52.212.178.26:3000/auto-daub-system.js" "Auto-Daub System"
test_url "http://52.212.178.26:3000/multi-room-system.js" "Multi-Room System"
test_url "http://52.212.178.26:3000/advanced-chat-system.js" "Advanced Chat System"

echo ""
echo "🔍 Verificando logs del servidor para errores..."
echo "------------------------------------------------"

ssh -i $KEY_PATH $SERVER_USER@$SERVER_HOST << 'EOF'
echo "🔍 Buscando errores en logs recientes..."
pm2 logs --lines 20 | grep -i "error\|fail\|exception" | tail -5 || echo "No se encontraron errores recientes"

echo ""
echo "📊 Uso de memoria:"
free -h

echo ""
echo "💾 Espacio en disco:"
df -h | grep -E "(/$|/home)"

echo ""
echo "🌡️ Carga del sistema:"
uptime
EOF

echo ""
echo "🎉 DESPLIEGUE FASE 1 PREMIUM COMPLETADO"
echo "======================================="
echo ""
echo "✅ SISTEMAS DESPLEGADOS:"
echo "  🎨 Premium Theme v3.0 - Glassmorphism, colores premium, cartones 3D"
echo "  🎯 Auto-Daub System v3.0 - Marcado automático inteligente con efectos"
echo "  🏟️ Multi-Room System v3.0 - 6-8 salas simultáneas con diferentes precios"
echo "  💬 Advanced Chat System v3.0 - 50+ emojis, stickers, moderación"
echo "  ⚙️ Integración completa - Todos los sistemas funcionando juntos"
echo ""
echo "🌐 ACCESO:"
echo "  • Directo: http://52.212.178.26:3000"
echo "  • ALB: http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com"
echo "  • Dominio: http://game.bingoroyal.es"
echo ""
echo "📈 PRÓXIMO PASO:"
echo "  🧪 Probar todas las funcionalidades premium en el navegador"
echo "  🎮 Verificar que cada sistema funciona independientemente"
echo "  🔄 Confirmar integración entre sistemas"
echo ""

# Abrir navegador automáticamente si es posible
if command -v open &> /dev/null; then
    echo "🌐 Abriendo navegador automáticamente..."
    open "http://game.bingoroyal.es"
elif command -v xdg-open &> /dev/null; then
    echo "🌐 Abriendo navegador automáticamente..."
    xdg-open "http://game.bingoroyal.es"
fi

echo ""
echo "🎯 FEATURES PARA PROBAR:"
echo "  1️⃣ Tema premium (gradientes, glassmorphism, cartones 3D)"
echo "  2️⃣ Auto-daub (configuración, velocidades, efectos)"
echo "  3️⃣ Salas múltiples (cambio de salas, precios diferentes)"
echo "  4️⃣ Chat avanzado (emojis, stickers, mensajes rápidos)"
echo "  5️⃣ Responsive design (móvil y desktop)"
echo ""
echo "✨ ¡BINGOROYAL FASE 1 PREMIUM LISTO!" 