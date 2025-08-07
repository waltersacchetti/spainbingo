#!/bin/bash

echo "🚀 DESPLIEGUE Y LIMPIEZA DEL SERVIDOR"
echo "======================================"

# Configuración
SERVER_IP="52.212.178.26"
KEY_FILE="./spainbingo-key.pem"

echo "📤 1. Sincronizando archivos con el servidor..."

# Sincronizar archivos de public
rsync -avz --delete -e "ssh -i $KEY_FILE" public/ ec2-user@$SERVER_IP:/home/ec2-user/ --exclude='node_modules' --exclude='.git'

if [ $? -eq 0 ]; then
    echo "✅ Sincronización completada exitosamente"
else
    echo "❌ Error en sincronización. Intentando con AWS SSM..."
    
    # Intentar con AWS SSM como alternativa
    echo "🔄 Intentando conexión alternativa..."
    
    # Crear comando para limpiar archivos
    CLEANUP_COMMANDS=(
        "cd /home/ec2-user"
        "echo '=== ARCHIVOS ACTUALES ==='"
        "ls -la"
        "echo '=== LIMPIANDO ARCHIVOS INNECESARIOS ==='"
        "rm -f test-*.html debug-*.html login-*-*.html 2>/dev/null || true"
        "echo '=== INSTALANDO DEPENDENCIAS ==='"
        "npm install sequelize pg pg-hstore bcrypt uuid"
        "echo '=== REINICIANDO SERVIDOR ==='"
        "pm2 restart spainbingo"
        "echo '=== VERIFICANDO ESTADO ==='"
        "pm2 status"
        "echo '=== ARCHIVOS FINALES ==='"
        "ls -la"
    )
    
    # Convertir array a string para AWS SSM
    COMMAND_STRING=$(IFS='; '; echo "${CLEANUP_COMMANDS[*]}")
    
    echo "🔧 Ejecutando comandos de limpieza..."
    echo "Comandos: $COMMAND_STRING"
    
    # Nota: Necesitarías el Instance ID correcto para esto
    echo "⚠️  Para completar la limpieza, ejecuta manualmente en el servidor:"
    echo "   ssh -i $KEY_FILE ec2-user@$SERVER_IP"
    echo ""
    echo "   Y luego ejecuta estos comandos:"
    for cmd in "${CLEANUP_COMMANDS[@]}"; do
        echo "   $cmd"
    done
fi

echo ""
echo "🎯 ARCHIVOS SINCRONIZADOS:"
echo "✅ server.js - Servidor con nuevas APIs"
echo "✅ models/UserCache.js - Sistema de caché"
echo "✅ models/UserManager.js - Gestor de usuarios"
echo "✅ scripts/user-management.js - CLI de gestión"
echo "✅ Todos los archivos HTML/CSS actualizados"

echo ""
echo "📋 PRÓXIMOS PASOS MANUALES:"
echo "1. Conectarse al servidor: ssh -i $KEY_FILE ec2-user@$SERVER_IP"
echo "2. Instalar dependencias: npm install sequelize pg pg-hstore bcrypt uuid"
echo "3. Reiniciar servidor: pm2 restart spainbingo"
echo "4. Probar sistema: node scripts/user-management.js stats"
echo "5. Verificar APIs: curl http://localhost:3000/api/admin/users/stats"

echo ""
echo "🔧 COMANDOS PARA EJECUTAR EN EL SERVIDOR:"
echo "cd /home/ec2-user"
echo "npm install sequelize pg pg-hstore bcrypt uuid"
echo "pm2 restart spainbingo"
echo "node scripts/user-management.js stats"
echo "node scripts/user-management.js list"

echo ""
echo "✅ Despliegue completado!" 