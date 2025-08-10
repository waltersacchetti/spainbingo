#!/bin/bash

# Script para configurar SendGrid como servicio de email alternativo
# Uso: ./setup-sendgrid.sh

echo "📧 Configurando SendGrid como servicio de email alternativo..."
echo "=================================================="

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Debes ejecutar este script desde el directorio raíz del proyecto"
    exit 1
fi

# Instalar dependencia de SendGrid
echo "📦 Instalando dependencia @sendgrid/mail..."
npm install @sendgrid/mail

if [ $? -eq 0 ]; then
    echo "✅ @sendgrid/mail instalado correctamente"
else
    echo "❌ Error instalando @sendgrid/mail"
    exit 1
fi

# Crear archivo de configuración de ejemplo
echo "📝 Creando archivo de configuración de ejemplo..."

cat > .env.sendgrid.example << EOF
# SendGrid Configuration
SENDGRID_API_KEY=SG.tu_api_key_aqui
SENDGRID_FROM_EMAIL=noreply@info.bingoroyal.es
SENDGRID_FROM_NAME=BingoRoyal
SENDGRID_TEMPLATE_ID=d-verification-template-id

# Cambiar servicio preferido (opcional)
PREFERRED_EMAIL_SERVICE=sendgrid
EOF

echo "✅ Archivo .env.sendgrid.example creado"

# Verificar que los servicios estén creados
echo "🔍 Verificando servicios de email..."

if [ -f "public/services/SendGridService.js" ]; then
    echo "✅ SendGridService.js encontrado"
else
    echo "❌ SendGridService.js no encontrado"
fi

if [ -f "public/services/HybridEmailService.js" ]; then
    echo "✅ HybridEmailService.js encontrado"
else
    echo "❌ HybridEmailService.js no encontrado"
fi

# Instrucciones para el usuario
echo ""
echo "🎯 PRÓXIMOS PASOS:"
echo "=================================================="
echo "1. Ve a https://sendgrid.com y crea una cuenta gratuita"
echo "2. Obtén tu API Key desde Settings > API Keys"
echo "3. Copia el archivo .env.sendgrid.example a .env en el servidor"
echo "4. Reemplaza 'SG.tu_api_key_aqui' con tu API key real"
echo "5. Reinicia la aplicación con: pm2 restart 0 --update-env"
echo ""
echo "📚 Para más detalles, consulta SENDGRID-SETUP.md"
echo ""
echo "🚀 ¡SendGrid configurado exitosamente!" 