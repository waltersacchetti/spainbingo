#!/bin/bash

echo "🚀 CONFIGURACIÓN AWS SES PARA BINGOROYAL"
echo "========================================"

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}📋 PASO 1: CREAR USUARIO IAM PARA SES${NC}"
echo -e "1. Ve a AWS Console → IAM → Users"
echo -e "2. Create user: 'bingoroyal-ses-user'"
echo -e "3. Attach policies directly:"
echo -e "   • AmazonSESFullAccess"
echo -e "4. Create access key:"
echo -e "   • Use case: Application running outside AWS"
echo -e "   • Guardar Access Key ID y Secret Access Key"
echo ""

echo -e "${BLUE}📋 PASO 2: VERIFICAR DOMINIO EN SES${NC}"
echo -e "1. AWS Console → Simple Email Service"
echo -e "2. Verified identities → Create identity"
echo -e "3. Identity type: Domain"
echo -e "4. Domain: game.bingoroyal.es"
echo -e "5. Configuration set: Default"
echo -e "6. Usar DKIM:"
echo -e "   • Easy DKIM: Enabled"
echo -e "   • DKIM signing key length: RSA_2048_BIT"
echo -e "7. Configurar registros DNS en Route 53"
echo ""

echo -e "${BLUE}📋 PASO 3: CONFIGURAR EMAILS DE ENVÍO${NC}"
echo -e "1. Create identity → Email address"
echo -e "2. Emails a verificar:"
echo -e "   • noreply@bingoroyal.es"
echo -e "   • support@bingoroyal.es"
echo -e "   • notifications@bingoroyal.es"
echo ""

echo -e "${BLUE}📋 PASO 4: SOLICITAR PRODUCCIÓN${NC}"
echo -e "1. Account dashboard → Request production access"
echo -e "2. Use case: Transactional"
echo -e "3. Website URL: https://game.bingoroyal.es"
echo -e "4. Descripción del caso de uso:"
echo -e "   'BingoRoyal es una aplicación de bingo online que envía:"
echo -e "   - Emails de verificación de cuenta"
echo -e "   - Notificaciones de juego"
echo -e "   - Recuperación de contraseña"
echo -e "   - Confirmaciones de transacciones'"
echo -e "5. Proceso de opt-in: Double opt-in con confirmación"
echo -e "6. Bounce/complaint handling: Automático via SNS"
echo ""

echo -e "${BLUE}📋 PASO 5: CONFIGURAR VARIABLES DE ENTORNO${NC}"
echo -e "Crear archivo .env.production:"
echo -e ""
echo -e "# AWS SES Configuration"
echo -e "AWS_REGION=eu-west-1"
echo -e "AWS_ACCESS_KEY_ID=tu_access_key_aqui"
echo -e "AWS_SECRET_ACCESS_KEY=tu_secret_key_aqui"
echo -e "SES_FROM_EMAIL=noreply@bingoroyal.es"
echo -e "SES_FROM_NAME=BingoRoyal"
echo -e "SES_REPLY_TO=support@bingoroyal.es"
echo ""

echo -e "${YELLOW}⚠️  IMPORTANTE:${NC}"
echo -e "• Guarda las credenciales de forma segura"
echo -e "• No commitees el archivo .env.production al repo"
echo -e "• SES empezará en Sandbox mode (solo emails verificados)"
echo -e "• La solicitud de producción puede tardar 24-48 horas"
echo ""

echo -e "${GREEN}✅ PRÓXIMOS PASOS:${NC}"
echo -e "1. Configurar credenciales en AWS Console"
echo -e "2. Verificar dominio game.bingoroyal.es"
echo -e "3. Instalar AWS SDK en la aplicación"
echo -e "4. Implementar sistema de emails" 