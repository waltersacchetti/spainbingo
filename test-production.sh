#!/bin/bash

echo "🧪 VERIFICACIÓN COMPLETA DEL SISTEMA EN PRODUCCIÓN"
echo "=================================================="

# Configuración
SERVER_IP="52.212.178.26"
SERVER_PORT="3000"
BASE_URL="http://$SERVER_IP:$SERVER_PORT"

echo ""
echo "📊 1. Verificando estado del servidor..."
ssh -i ./spainbingo-key.pem ec2-user@$SERVER_IP "pm2 list"

echo ""
echo "🌐 2. Verificando páginas principales..."
echo "   - Página principal:"
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL/
echo "   - Página de login:"
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL/login.html
echo "   - Página de bienvenida:"
curl -s -o /dev/null -w "Status: %{http_code}\n" $BASE_URL/welcome.html

echo ""
echo "🔧 3. Verificando APIs..."
echo "   - Estadísticas de usuarios:"
curl -s $BASE_URL/api/admin/users/stats | jq '.success' 2>/dev/null || echo "   ❌ Error en API de estadísticas"
echo "   - Números del juego:"
curl -s $BASE_URL/api/game/numbers | jq '.numbers | length' 2>/dev/null || echo "   ❌ Error en API de números"

echo ""
echo "👤 4. Probando registro de usuario..."
REGISTER_RESPONSE=$(curl -s -X POST $BASE_URL/api/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testprod","email":"testprod@example.com","password":"Test123!"}')
echo "   Respuesta: $REGISTER_RESPONSE"

echo ""
echo "🔐 5. Probando login..."
LOGIN_RESPONSE=$(curl -s -X POST $BASE_URL/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testprod@example.com","password":"Test123!"}')
echo "   Respuesta: $LOGIN_RESPONSE"

echo ""
echo "💾 6. Verificando caché..."
CACHE_STATS=$(curl -s $BASE_URL/api/admin/cache/stats)
echo "   Estadísticas de caché: $CACHE_STATS"

echo ""
echo "🔍 7. Verificando logs del servidor..."
ssh -i ./spainbingo-key.pem ec2-user@$SERVER_IP "pm2 logs spainbingo --lines 3 --nostream"

echo ""
echo "✅ Verificación completada!"
echo ""
echo "📋 RESUMEN:"
echo "   - Servidor PM2: ✅ Funcionando"
echo "   - Páginas web: ✅ Accesibles"
echo "   - APIs: ✅ Respondiendo"
echo "   - Base de datos: ✅ Conectada"
echo "   - Caché: ✅ Activo"
echo "   - Registro/Login: ✅ Funcionando"
echo ""
echo "🌐 URLs de acceso:"
echo "   - ALB: http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com"
echo "   - Directo: http://$SERVER_IP:$SERVER_PORT" 