#!/bin/bash

echo "🔧 CONFIGURANDO CONEXIÓN RDS"
echo "=============================="

# Obtener información de la RDS
echo "📊 Obteniendo información de la RDS..."
RDS_INFO=$(aws rds describe-db-instances --db-instance-identifier spainbingo-db --query 'DBInstances[0]' --output json)

if [ $? -ne 0 ]; then
    echo "❌ Error al obtener información de la RDS"
    exit 1
fi

# Extraer Security Group ID
SECURITY_GROUP_ID=$(echo $RDS_INFO | jq -r '.VpcSecurityGroups[0].VpcSecurityGroupId')
echo "🔒 Security Group ID: $SECURITY_GROUP_ID"

# Obtener IP privada de la EC2
EC2_PRIVATE_IP="172.31.40.10"
echo "🖥️  IP privada de EC2: $EC2_PRIVATE_IP"

# Verificar reglas actuales
echo "📋 Reglas actuales del Security Group:"
aws ec2 describe-security-groups --group-ids $SECURITY_GROUP_ID --query 'SecurityGroups[0].IpPermissions' --output table

# Agregar regla para permitir conexión desde la EC2
echo "➕ Agregando regla para permitir conexión desde EC2..."
aws ec2 authorize-security-group-ingress \
    --group-id $SECURITY_GROUP_ID \
    --protocol tcp \
    --port 5432 \
    --cidr $EC2_PRIVATE_IP/32

if [ $? -eq 0 ]; then
    echo "✅ Regla agregada correctamente"
else
    echo "⚠️  La regla ya existe o hubo un error"
fi

# Verificar reglas actualizadas
echo "📋 Reglas actualizadas del Security Group:"
aws ec2 describe-security-groups --group-ids $SECURITY_GROUP_ID --query 'SecurityGroups[0].IpPermissions' --output table

echo "✅ Configuración RDS completada" 