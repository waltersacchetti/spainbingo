#!/bin/bash

# Script de Configuración ALB para SpainBingo
# Autor: SpainBingo Team
# Fecha: 3 de Agosto de 2024

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
ALB_NAME="spainbingo-alb"
TARGET_GROUP_NAME="spainbingo-tg"
REGION="eu-west-1"
ALB_SECURITY_GROUP_NAME="spainbingo-alb-sg"

echo -e "${BLUE}⚖️ Configurando Application Load Balancer para SpainBingo${NC}"

# Función para mostrar progreso
show_progress() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para mostrar advertencia
show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Función para mostrar error
show_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Verificar dependencias
check_dependencies() {
    echo "🔍 Verificando dependencias..."
    
    if ! command -v aws &> /dev/null; then
        show_error "AWS CLI no está instalado."
    fi
    
    if ! command -v jq &> /dev/null; then
        show_error "jq no está instalado. Es necesario para procesar JSON."
    fi
    
    show_progress "Dependencias verificadas"
}

# Verificar configuración de AWS
check_aws_config() {
    echo "🔍 Verificando configuración de AWS..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        show_error "No se puede autenticar con AWS. Verifica tus credenciales."
    fi
    
    show_progress "Configuración de AWS verificada"
}

# Crear Security Group para ALB
create_alb_security_group() {
    echo "🛡️ Creando Security Group para ALB..."
    
    if aws ec2 describe-security-groups --group-names $ALB_SECURITY_GROUP_NAME &> /dev/null; then
        show_warning "El Security Group '$ALB_SECURITY_GROUP_NAME' ya existe"
        ALB_SG_ID=$(aws ec2 describe-security-groups --group-names $ALB_SECURITY_GROUP_NAME --query 'SecurityGroups[0].GroupId' --output text)
    else
        ALB_SG_ID=$(aws ec2 create-security-group \
            --group-name $ALB_SECURITY_GROUP_NAME \
            --description "Security group for SpainBingo ALB" \
            --query 'GroupId' --output text)
        
        # Reglas de entrada para ALB
        aws ec2 authorize-security-group-ingress \
            --group-id $ALB_SG_ID \
            --protocol tcp \
            --port 80 \
            --cidr 0.0.0.0/0
        
        aws ec2 authorize-security-group-ingress \
            --group-id $ALB_SG_ID \
            --protocol tcp \
            --port 443 \
            --cidr 0.0.0.0/0
        
        show_progress "Security Group para ALB creado: $ALB_SG_ID"
    fi
}

# Configurar reglas de seguridad entre ALB y EC2
configure_security_rules() {
    echo "🔒 Configurando reglas de seguridad entre ALB y EC2..."
    
    # Verificar que las variables estén definidas
    if [ -z "$SG_ID" ]; then
        show_error "Security Group ID de EC2 no está definido"
        return 1
    fi
    
    if [ -z "$ALB_SG_ID" ]; then
        show_error "Security Group ID de ALB no está definido"
        return 1
    fi
    
    # Verificar si la regla ya existe de forma más simple
    echo "🔍 Verificando si la regla ya existe..."
    existing_rules=$(aws ec2 describe-security-groups \
        --group-ids $SG_ID \
        --query "SecurityGroups[0].IpPermissions[?FromPort==\`3000\` && ToPort==\`3000\` && IpProtocol==\`tcp\`]" \
        --output text)
    
    if [ -n "$existing_rules" ]; then
        echo "✅ La regla de seguridad ya existe, saltando creación..."
        show_progress "Reglas de seguridad ya configuradas"
        return 0
    fi
    
    echo "📝 Creando nueva regla de seguridad..."
    # Permitir tráfico del ALB a la instancia EC2 (puerto 3000)
    aws ec2 authorize-security-group-ingress \
        --group-id $SG_ID \
        --protocol tcp \
        --port 3000 \
        --source-group $ALB_SG_ID
    
    if [ $? -eq 0 ]; then
        show_progress "Reglas de seguridad configuradas correctamente"
    else
        show_error "Error al configurar reglas de seguridad"
        return 1
    fi
}

# Cargar información de la instancia
load_instance_info() {
    if [ -f ec2-info.txt ]; then
        source ec2-info.txt
        echo "📋 Información de la instancia cargada"
        
        # Obtener Security Group ID de la instancia
        SG_ID=$(aws ec2 describe-instances \
            --instance-ids $INSTANCE_ID \
            --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
            --output text)
        
        echo "🛡️ Security Group de EC2: $SG_ID"
    else
        show_error "No se encontró ec2-info.txt. Ejecuta deploy-ec2.sh primero."
    fi
}

# Crear Target Group
create_target_group() {
    echo "🎯 Creando Target Group..."
    
    if aws elbv2 describe-target-groups --names $TARGET_GROUP_NAME &> /dev/null; then
        show_warning "El Target Group '$TARGET_GROUP_NAME' ya existe"
        TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names $TARGET_GROUP_NAME --query 'TargetGroups[0].TargetGroupArn' --output text)
    else
        TARGET_GROUP_ARN=$(aws elbv2 create-target-group \
            --name $TARGET_GROUP_NAME \
            --protocol HTTP \
            --port 3000 \
            --vpc-id $(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].VpcId' --output text) \
            --target-type instance \
            --health-check-path /health \
            --health-check-interval-seconds 30 \
            --health-check-timeout-seconds 5 \
            --healthy-threshold-count 2 \
            --unhealthy-threshold-count 2 \
            --query 'TargetGroups[0].TargetGroupArn' --output text)
        
        show_progress "Target Group creado: $TARGET_GROUP_ARN"
    fi
}

# Registrar instancia en Target Group
register_instance() {
    echo "📝 Registrando instancia en Target Group..."
    
    aws elbv2 register-targets \
        --target-group-arn $TARGET_GROUP_ARN \
        --targets Id=$INSTANCE_ID
    
    show_progress "Instancia registrada en Target Group"
}

# Crear Application Load Balancer
create_alb() {
    echo "⚖️ Creando Application Load Balancer..."
    
    if aws elbv2 describe-load-balancers --names $ALB_NAME &> /dev/null; then
        show_warning "El ALB '$ALB_NAME' ya existe"
        ALB_ARN=$(aws elbv2 describe-load-balancers --names $ALB_NAME --query 'LoadBalancers[0].LoadBalancerArn' --output text)
        ALB_DNS=$(aws elbv2 describe-load-balancers --names $ALB_NAME --query 'LoadBalancers[0].DNSName' --output text)
    else
        # Obtener subnets
        VPC_ID=$(aws ec2 describe-instances --instance-ids $INSTANCE_ID --query 'Reservations[0].Instances[0].VpcId' --output text)
        SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text | tr '\t' ' ')
        
        # Crear ALB con Security Group específico
        ALB_RESPONSE=$(aws elbv2 create-load-balancer \
            --name $ALB_NAME \
            --subnets $SUBNET_IDS \
            --security-groups $ALB_SG_ID \
            --scheme internet-facing \
            --type application \
            --ip-address-type ipv4)
        
        ALB_ARN=$(echo "$ALB_RESPONSE" | jq -r '.LoadBalancers[0].LoadBalancerArn')
        ALB_DNS=$(echo "$ALB_RESPONSE" | jq -r '.LoadBalancers[0].DNSName')
        
        show_progress "ALB creado: $ALB_DNS"
    fi
}

# Crear Listener
create_listener() {
    echo "🎧 Creando Listener..."
    
    # Verificar si ya existe un listener
    EXISTING_LISTENER=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[0].ListenerArn' --output text 2>/dev/null || echo "")
    
    if [ "$EXISTING_LISTENER" != "None" ] && [ -n "$EXISTING_LISTENER" ]; then
        show_warning "Listener ya existe en el ALB"
        LISTENER_ARN=$EXISTING_LISTENER
    else
        # Crear listener HTTP
        LISTENER_ARN=$(aws elbv2 create-listener \
            --load-balancer-arn $ALB_ARN \
            --protocol HTTP \
            --port 80 \
            --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
            --query 'Listeners[0].ListenerArn' --output text)
        
        show_progress "Listener HTTP creado"
    fi
}

# Configurar HTTPS (opcional)
configure_https() {
    echo "🔒 Configurando HTTPS..."
    
    # Usar el certificado específico proporcionado
    CERTIFICATE_ARN="arn:aws:acm:eu-west-1:426448793571:certificate/b5635eb9-328e-4500-9456-2028d4664ed5"
    
    # Verificar que el certificado existe
    echo "🔍 Verificando certificado: $CERTIFICATE_ARN"
    certificate_status=$(aws acm describe-certificate \
        --certificate-arn $CERTIFICATE_ARN \
        --query 'Certificate.Status' \
        --output text 2>/dev/null)
    
    if [ $? -eq 0 ] && [ "$certificate_status" = "ISSUED" ]; then
        echo "✅ Certificado válido encontrado"
        
        # Crear listener HTTPS
        HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
            --load-balancer-arn $ALB_ARN \
            --protocol HTTPS \
            --port 443 \
            --certificates CertificateArn=$CERTIFICATE_ARN \
            --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
            --query 'Listeners[0].ListenerArn' \
            --output text)
        
        if [ $? -eq 0 ]; then
            echo "✅ Listener HTTPS creado: $HTTPS_LISTENER_ARN"
            
            # Crear regla de redirección HTTP a HTTPS
            aws elbv2 create-listener \
                --load-balancer-arn $ALB_ARN \
                --protocol HTTP \
                --port 80 \
                --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
                --query 'Listeners[0].ListenerArn' \
                --output text > /dev/null
            
            if [ $? -eq 0 ]; then
                echo "✅ Redirección HTTP a HTTPS configurada"
                show_progress "HTTPS configurado correctamente"
            else
                show_error "Error al configurar redirección HTTP a HTTPS"
            fi
        else
            show_error "Error al crear listener HTTPS"
        fi
    else
        show_error "Certificado no válido o no encontrado: $CERTIFICATE_ARN"
        echo "⚠️  Continuando sin HTTPS..."
    fi
}

# Configurar reglas de redirección
setup_redirect_rules() {
    echo "🔄 Configurando reglas de redirección..."
    
    # Redirigir HTTP a HTTPS si existe HTTPS
    if [ -n "$HTTPS_LISTENER_ARN" ]; then
        aws elbv2 modify-listener \
            --listener-arn $LISTENER_ARN \
            --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
        
        show_progress "Regla de redirección HTTP→HTTPS configurada"
    fi
}

# Configurar health check personalizado
setup_health_check() {
    echo "🏥 Configurando health check..."
    
    aws elbv2 modify-target-group \
        --target-group-arn $TARGET_GROUP_ARN \
        --health-check-path /health \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 2
    
    show_progress "Health check configurado"
}

# Guardar información del ALB
save_alb_info() {
    echo "💾 Guardando información del ALB..."
    
    cat > alb-info.txt << EOF
ALB_NAME=$ALB_NAME
ALB_ARN=$ALB_ARN
ALB_DNS=$ALB_DNS
TARGET_GROUP_NAME=$TARGET_GROUP_NAME
TARGET_GROUP_ARN=$TARGET_GROUP_ARN
LISTENER_ARN=$LISTENER_ARN
HTTPS_LISTENER_ARN=$HTTPS_LISTENER_ARN
INSTANCE_ID=$INSTANCE_ID
ALB_SECURITY_GROUP_NAME=$ALB_SECURITY_GROUP_NAME
ALB_SECURITY_GROUP_ID=$ALB_SG_ID
EOF
    
    show_progress "Información guardada en alb-info.txt"
}

# Mostrar información del ALB
show_alb_info() {
    echo ""
    echo "📊 Información del Application Load Balancer:"
    echo "============================================="
    echo "Nombre: $ALB_NAME"
    echo "DNS: $ALB_DNS"
    echo "URL: http://$ALB_DNS"
    if [ -n "$HTTPS_LISTENER_ARN" ]; then
        echo "URL HTTPS: https://$ALB_DNS"
    fi
    echo "Target Group: $TARGET_GROUP_NAME"
    echo "Instancia: $INSTANCE_ID"
    echo "Security Group ALB: $ALB_SECURITY_GROUP_NAME ($ALB_SG_ID)"
    echo ""
    echo "🌐 URLs de acceso:"
    echo "   HTTP: http://$ALB_DNS"
    if [ -n "$HTTPS_LISTENER_ARN" ]; then
        echo "   HTTPS: https://$ALB_DNS"
    fi
    echo "   Directo: http://$PUBLIC_IP:3000"
    echo ""
    echo "🛡️ Security Groups:"
    echo "   ALB: $ALB_SECURITY_GROUP_NAME (Puertos 80, 443)"
    echo "   EC2: $SECURITY_GROUP_NAME (Puerto 3000)"
    echo ""
}

# Función principal
main() {
    echo -e "${BLUE}⚖️ Configurando Application Load Balancer para SpainBingo${NC}"
    echo "=========================================================="
    
    check_dependencies
    check_aws_config
    load_instance_info
    create_alb_security_group
    configure_security_rules
    create_target_group
    register_instance
    create_alb
    create_listener
    configure_https
    setup_redirect_rules
    setup_health_check
    save_alb_info
    show_alb_info
    
    echo "=========================================================="
    echo -e "${GREEN}🎉 ALB configurado exitosamente${NC}"
    echo ""
    echo -e "${YELLOW}📋 Próximos pasos:${NC}"
    echo "1. Esperar 2-3 minutos para que el health check pase"
    echo "2. Probar la URL del ALB"
    echo "3. Configurar dominio personalizado (opcional)"
    echo ""
    echo -e "${YELLOW}⚠️  Notas:${NC}"
    echo "   - El ALB tarda 2-3 minutos en estar completamente activo"
    echo "   - El health check verifica /health en tu aplicación"
    echo "   - HTTPS requiere un certificado SSL en ACM"
    echo "   - Puedes agregar más instancias al Target Group"
    echo "   - Security Groups configurados automáticamente"
}

# Ejecutar función principal
main "$@" 