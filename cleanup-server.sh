#!/bin/bash

echo "🧹 LIMPIANDO SERVIDOR..."
echo "========================="

# Sincronizar archivos de public
echo "📤 Sincronizando archivos..."
rsync -avz --delete -e "ssh -i ./spainbingo-key.pem" public/ ec2-user@52.212.178.26:/home/ec2-user/ --exclude='node_modules' --exclude='.git'

if [ $? -eq 0 ]; then
    echo "✅ Sincronización completada"
else
    echo "❌ Error en sincronización"
    exit 1
fi

echo ""
echo "🎯 ARCHIVOS SINCRONIZADOS:"
echo "- server.js (con nuevas APIs de gestión de usuarios)"
echo "- models/UserCache.js (sistema de caché)"
echo "- models/UserManager.js (gestor mejorado de usuarios)"
echo "- scripts/user-management.js (CLI para gestión)"
echo "- Todos los archivos HTML y CSS actualizados"

echo ""
echo "📋 PRÓXIMOS PASOS:"
echo "1. Reiniciar el servidor: pm2 restart spainbingo"
echo "2. Probar el sistema: node scripts/user-management.js stats"
echo "3. Verificar APIs: curl http://localhost:3000/api/admin/users/stats"

echo ""
echo "✅ Limpieza y sincronización completadas!" 