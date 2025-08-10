#!/bin/bash

# Script para limpiar todas las referencias a AWS del servidor
# Uso: ./cleanup-aws.sh

echo "🧹 Limpiando todas las referencias a AWS del servidor..."
echo "=================================================="

# Conectar al servidor
echo "🔌 Conectando al servidor..."
ssh -i public/spainbingo-key.pem ec2-user@52.212.178.26 << 'EOF'

echo "📁 Limpiando variables de entorno de AWS..."

# Crear backup del .env actual
if [ -f ".env" ]; then
    cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backup del .env creado"
fi

# Crear nuevo .env sin AWS
cat > .env << 'ENVEOF'
# SendGrid Configuration
SENDGRID_API_KEY=SG.tu_api_key_aqui
SENDGRID_FROM_EMAIL=noreply@info.bingoroyal.es
SENDGRID_FROM_NAME=BingoRoyal
SENDGRID_TEMPLATE_ID=d-verification-template-id

# Base de Datos Production
DB_HOST=spainbingo-db.clzgxn85wdjh.eu-west-1.rds.amazonaws.com
DB_PORT=5432
DB_NAME=spainbingo
DB_USERNAME=spainbingo_admin
DB_PASSWORD=SpainBingo2024!
NODE_ENV=production

# Configuración de Email
EMAIL_FALLBACK_ENABLED=false
EMAIL_MAX_RETRIES=3
EMAIL_RETRY_DELAY=1000
ENVEOF

echo "✅ Nuevo .env creado sin variables de AWS"

# Instalar dependencia de SendGrid
echo "📦 Instalando @sendgrid/mail..."
cd /home/ec2-user/public
npm install @sendgrid/mail

if [ $? -eq 0 ]; then
    echo "✅ @sendgrid/mail instalado correctamente"
else
    echo "❌ Error instalando @sendgrid/mail"
fi

# Reiniciar aplicación con nuevas variables
echo "🔄 Reiniciando aplicación..."
pm2 restart 0 --update-env

if [ $? -eq 0 ]; then
    echo "✅ Aplicación reiniciada correctamente"
else
    echo "❌ Error reiniciando aplicación"
fi

echo "🧹 Limpieza de AWS completada!"
echo "=================================================="
echo "📋 PRÓXIMOS PASOS:"
echo "1. Obtener API Key de SendGrid desde sendgrid.com"
echo "2. Reemplazar 'SG.tu_api_key_aqui' en .env con tu API key real"
echo "3. Reiniciar aplicación: pm2 restart 0 --update-env"
echo "4. Probar envío de emails de verificación"

EOF

echo "✅ Script de limpieza ejecutado en el servidor"
echo "📚 Consulta SENDGRID-SETUP.md para más detalles" 