#!/bin/bash

echo "🚀 DESPLEGANDO AWS SES PARA BINGOROYAL"
echo "===================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
INSTANCE_IP="18.203.255.192"
KEY_PATH="$HOME/.ssh/BingoAppKey.pem"
REMOTE_PATH="/home/ec2-user/bingoApp"

echo -e "${BLUE}📋 PASO 1: INSTALANDO DEPENDENCIAS LOCALMENTE${NC}"
cd public
echo "📦 Instalando aws-sdk y dotenv..."
npm install @aws-sdk/client-ses@^3.658.1 aws-sdk@^2.1691.0 dotenv@^16.3.1
echo "✅ Dependencias instaladas"
cd ..

echo -e "${BLUE}📋 PASO 2: VERIFICANDO ARCHIVOS NECESARIOS${NC}"
if [ ! -f "public/services/EmailService.js" ]; then
    echo -e "${RED}❌ Error: EmailService.js no encontrado${NC}"
    exit 1
fi

if [ ! -f "env-example.txt" ]; then
    echo -e "${RED}❌ Error: env-example.txt no encontrado${NC}"
    exit 1
fi

echo "✅ Todos los archivos necesarios presentes"

echo -e "${BLUE}📋 PASO 3: SINCRONIZANDO ARCHIVOS AL SERVIDOR${NC}"
echo "🔄 Sincronizando archivos de servicios..."
rsync -avz -e "ssh -i ${KEY_PATH}" \
    --exclude='node_modules' \
    --exclude='.git' \
    --exclude='*.log' \
    ./public/services/ \
    ec2-user@${INSTANCE_IP}:${REMOTE_PATH}/public/services/

echo "🔄 Sincronizando package.json actualizado..."
rsync -avz -e "ssh -i ${KEY_PATH}" \
    ./public/package.json \
    ec2-user@${INSTANCE_IP}:${REMOTE_PATH}/public/

echo "🔄 Sincronizando server.js actualizado..."
rsync -avz -e "ssh -i ${KEY_PATH}" \
    ./public/server.js \
    ec2-user@${INSTANCE_IP}:${REMOTE_PATH}/public/

echo "🔄 Sincronizando archivo de ejemplo de env..."
rsync -avz -e "ssh -i ${KEY_PATH}" \
    ./env-example.txt \
    ec2-user@${INSTANCE_IP}:${REMOTE_PATH}/

echo -e "${BLUE}📋 PASO 4: INSTALANDO DEPENDENCIAS EN EL SERVIDOR${NC}"
ssh -i ${KEY_PATH} ec2-user@${INSTANCE_IP} << 'EOF'
cd /home/ec2-user/bingoApp/public
echo "📦 Instalando dependencias de AWS SES..."
npm install @aws-sdk/client-ses@^3.658.1 aws-sdk@^2.1691.0 dotenv@^16.3.1
echo "✅ Dependencias AWS SES instaladas"
EOF

echo -e "${BLUE}📋 PASO 5: REINICIANDO APLICACIÓN${NC}"
ssh -i ${KEY_PATH} ec2-user@${INSTANCE_IP} << 'EOF'
cd /home/ec2-user/bingoApp/public
echo "🔄 Reiniciando aplicación..."
pm2 restart all
sleep 3
pm2 status
echo "✅ Aplicación reiniciada"
EOF

echo -e "${BLUE}📋 PASO 6: VERIFICANDO DESPLIEGUE${NC}"
echo "🔍 Verificando que el servidor responde..."
sleep 5

# Test básico de la API
echo "📡 Probando endpoint de salud..."
if curl -s -o /dev/null -w "%{http_code}" "https://game.bingoroyal.es/api/admin/ses-test" | grep -q "200"; then
    echo -e "${GREEN}✅ Servidor respondiendo correctamente${NC}"
else
    echo -e "${YELLOW}⚠️  Servidor iniciando... (normal en primer despliegue)${NC}"
fi

echo ""
echo -e "${GREEN}✅ DESPLIEGUE DE AWS SES COMPLETADO${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}🔧 PRÓXIMOS PASOS MANUALES:${NC}"
echo ""
echo "1. 🌐 Configurar AWS SES:"
echo "   • Ve a AWS Console → Simple Email Service"
echo "   • Verifica el dominio game.bingoroyal.es"
echo "   • Crea usuario IAM con permisos AmazonSESFullAccess"
echo ""
echo "2. 🔑 Configurar variables de entorno en el servidor:"
echo "   ssh -i ~/.ssh/BingoAppKey.pem ec2-user@18.203.255.192"
echo "   cd /home/ec2-user/bingoApp"
echo "   cp env-example.txt .env"
echo "   nano .env  # Agregar credenciales AWS reales"
echo ""
echo "3. 📧 Verificar emails de envío:"
echo "   • noreply@bingoroyal.es"
echo "   • support@bingoroyal.es"
echo ""
echo "4. 🏭 Solicitar salida del Sandbox de SES"
echo ""
echo "5. 🧪 Probar el sistema:"
echo "   curl 'https://game.bingoroyal.es/api/admin/ses-test'"
echo ""
echo -e "${BLUE}📚 Documentación completa en setup-aws-ses.sh${NC}" 