#!/bin/bash

echo "🔍 DIAGNÓSTICO COMPLETO DEL SERVIDOR BINGOROYAL"
echo "==============================================="

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Variables
INSTANCE_ID="i-04ab7400a1c44d0d6"
ALB_URL="https://game.bingoroyal.es"
EC2_IP="52.212.178.26"

echo -e "${BLUE}📊 PASO 1: VERIFICANDO INSTANCIA EC2${NC}"
echo "Instance ID: $INSTANCE_ID"

# Verificar estado de la instancia
INSTANCE_STATE=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].State.Name' --output text 2>/dev/null)
if [ "$INSTANCE_STATE" = "running" ]; then
    echo -e "${GREEN}✅ Instancia EC2: RUNNING${NC}"
else
    echo -e "${RED}❌ Instancia EC2: $INSTANCE_STATE${NC}"
    echo "🔧 Iniciando instancia..."
    aws ec2 start-instances --instance-ids $INSTANCE_ID
    echo "⏳ Esperando que la instancia inicie..."
    sleep 30
fi

echo ""
echo -e "${BLUE}📡 PASO 2: VERIFICANDO CONECTIVIDAD${NC}"

# Test directo a EC2
echo "🔍 Probando conexión directa a EC2..."
if curl -s --connect-timeout 5 "http://$EC2_IP:3000" > /dev/null; then
    echo -e "${GREEN}✅ EC2 responde directamente en puerto 3000${NC}"
else
    echo -e "${RED}❌ EC2 no responde en puerto 3000${NC}"
fi

# Test ALB
echo "🔍 Probando ALB..."
ALB_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "$ALB_URL")
if [ "$ALB_RESPONSE" = "200" ]; then
    echo -e "${GREEN}✅ ALB responde correctamente${NC}"
elif [ "$ALB_RESPONSE" = "502" ]; then
    echo -e "${RED}❌ ALB devuelve 502 - Backend no responde${NC}"
else
    echo -e "${YELLOW}⚠️  ALB responde con código: $ALB_RESPONSE${NC}"
fi

echo ""
echo -e "${BLUE}📋 PASO 3: VERIFICANDO APLICACIÓN EN EC2${NC}"

# Conectar y verificar estado de la aplicación
echo "🔍 Verificando PM2 y estado de la aplicación..."
ssh -i ~/.ssh/BingoAppKey.pem -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@$EC2_IP << 'EOF'
echo "📊 Estado de PM2:"
pm2 status

echo ""
echo "📋 Últimos logs de la aplicación:"
pm2 logs --lines 10

echo ""
echo "🔍 Verificando puerto 3000:"
netstat -tlnp | grep :3000

echo ""
echo "💾 Uso de memoria y CPU:"
free -h
top -bn1 | grep "Cpu\|Mem"

echo ""
echo "📁 Archivos recientes en /home/ec2-user/bingoApp/public:"
ls -la /home/ec2-user/bingoApp/public/ | head -10
EOF

echo ""
echo -e "${BLUE}📋 PASO 4: ACCIONES RECOMENDADAS${NC}"

if [ "$ALB_RESPONSE" = "502" ]; then
    echo -e "${YELLOW}🔧 Error 502 detectado. Acciones recomendadas:${NC}"
    echo "1. Reiniciar aplicación PM2"
    echo "2. Verificar que la aplicación escuche en puerto 3000"
    echo "3. Revisar logs de errores"
    echo "4. Verificar variables de entorno"
    echo ""
    echo "💡 ¿Quieres que ejecute un reinicio automático? (y/n)"
fi

echo ""
echo -e "${BLUE}📞 COMANDOS ÚTILES:${NC}"
echo "• Conectar SSH: ssh -i ~/.ssh/BingoAppKey.pem ec2-user@$EC2_IP"
echo "• Ver logs: pm2 logs"
echo "• Reiniciar app: pm2 restart all"
echo "• Estado PM2: pm2 status" 