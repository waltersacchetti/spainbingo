#!/bin/bash

# Script para probar el sistema de gestión de usuarios
echo "🧪 PROBANDO SISTEMA DE GESTIÓN DE USUARIOS"
echo "=========================================="

# Verificar que estamos en el directorio correcto
if [ ! -f "public/server.js" ]; then
    echo "❌ Error: No se encuentra server.js en public/"
    exit 1
fi

# Navegar al directorio public
cd public

echo ""
echo "📊 1. Verificando estadísticas de usuarios..."
node scripts/user-management.js stats

echo ""
echo "👥 2. Listando usuarios registrados..."
node scripts/user-management.js list

echo ""
echo "🆕 3. Mostrando usuarios recientes..."
node scripts/user-management.js recent 5

echo ""
echo "🏆 4. Mostrando usuarios top..."
node scripts/user-management.js top 5

echo ""
echo "🗄️ 5. Verificando estadísticas del caché..."
node scripts/user-management.js cache-stats

echo ""
echo "🔍 6. Buscando usuario de prueba..."
node scripts/user-management.js find test@spainbingo.es

echo ""
echo "👤 7. Obteniendo detalles del usuario ID 1..."
node scripts/user-management.js get 1

echo ""
echo "✅ Pruebas completadas!"
echo ""
echo "📋 COMANDOS DISPONIBLES:"
echo "   node scripts/user-management.js stats      - Estadísticas generales"
echo "   node scripts/user-management.js list       - Listar usuarios"
echo "   node scripts/user-management.js recent 10  - Usuarios recientes"
echo "   node scripts/user-management.js top 10     - Usuarios top"
echo "   node scripts/user-management.js find email - Buscar usuario"
echo "   node scripts/user-management.js get 1      - Obtener usuario por ID"
echo "   node scripts/user-management.js cache-stats - Estadísticas del caché"
echo "   node scripts/user-management.js cache-clear - Limpiar caché"
echo ""
echo "🎯 Para más información: node scripts/user-management.js help" 