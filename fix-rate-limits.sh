#!/bin/bash

echo "🔧 AJUSTANDO RATE LIMITS PARA DESARROLLO/PRUEBAS"
echo "================================================"

# Variables
INSTANCE_IP="52.212.178.26"
KEY_PATH="./spainbingo-key.pem"

echo "📊 PROBLEMAS IDENTIFICADOS:"
echo "• UserManager: 5 intentos, 15 min cooldown (MUY RESTRICTIVO)"
echo "• LoginLimiter: 20 intentos/min (OK)"
echo "• ApiLimiter: 200 requests/min (RESTRICTIVO)" 
echo "• VerificationLimiter: usa loginLimiter (RESTRICTIVO para testing)"
echo ""

echo "🛠️ APLICANDO AJUSTES MÁS PERMISIVOS..."

# Conectar al servidor y hacer cambios
ssh -i $KEY_PATH ec2-user@$INSTANCE_IP << 'EOF'
cd /home/ec2-user/public

echo "📝 1. Ajustando UserManager (registro)..."
# Backup del original
cp models/UserManager.js models/UserManager.js.original

# Hacer más permisivo el rate limiting de registro
sed -i 's/this\.maxRegistrationAttempts = 5;/this.maxRegistrationAttempts = 100;/' models/UserManager.js
sed -i 's/this\.registrationCooldown = 15 \* 60 \* 1000;/this.registrationCooldown = 30 \* 1000;/' models/UserManager.js

echo "✅ UserManager actualizado: 100 intentos, 30 segundos cooldown"

echo "📝 2. Ajustando rate limits del servidor..."
# Backup del servidor
cp server.js server.js.rate-backup

# Aumentar límites de APIs
sed -i 's/const loginLimiter = new RateLimiter(1 \* 60 \* 1000, 20);/const loginLimiter = new RateLimiter(1 * 60 * 1000, 100);/' server.js
sed -i 's/const apiLimiter = new RateLimiter(1 \* 60 \* 1000, 200);/const apiLimiter = new RateLimiter(1 * 60 * 1000, 1000);/' server.js

echo "✅ Server rate limits actualizados:"
echo "   • loginLimiter: 20 → 100 requests/min"
echo "   • apiLimiter: 200 → 1000 requests/min"
echo "   • bingoApiLimiter: 5000 requests/min (sin cambios)"

echo "📝 3. Reiniciando aplicación..."
pm2 restart all
sleep 3

echo "📊 Estado de la aplicación:"
pm2 status

echo ""
echo "✅ RATE LIMITS AJUSTADOS EXITOSAMENTE"
echo "======================================"
echo ""
echo "📊 NUEVA CONFIGURACIÓN:"
echo "• Registro: 100 intentos, 30 seg cooldown"
echo "• Login/Verification: 100 requests/min"
echo "• APIs generales: 1000 requests/min"
echo "• APIs de Bingo: 5000 requests/min"
echo ""
echo "🧪 Ahora puedes hacer pruebas sin restricciones!"

EOF

echo ""
echo "🎉 RATE LIMITS AJUSTADOS COMPLETAMENTE"
echo "====================================="
echo ""
echo "🧪 PRUEBA AHORA:"
echo "• Registro: Sin restricciones agresivas"
echo "• APIs: Mucho más permisivas"
echo "• Verificación: Sin bloqueos frecuentes"
echo ""
echo "🔄 Para restaurar configuración original:"
echo "• UserManager: models/UserManager.js.original"
echo "• Server: server.js.rate-backup" 