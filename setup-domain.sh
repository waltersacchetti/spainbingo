#!/bin/bash

# Script para configurar el dominio spain-bingo.es
# Configura DNS, certificado SSL y actualiza la aplicación

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensajes
show_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

show_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

show_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Variables
DOMAIN="spain-bingo.es"
WWW_DOMAIN="www.spain-bingo.es"
REGION="eu-west-1"
ALB_DNS="spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com"

# Verificar AWS CLI
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        show_error "AWS CLI no está instalado"
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        show_error "AWS CLI no está configurado. Ejecuta 'aws configure'"
        exit 1
    fi
    
    show_success "AWS CLI configurado correctamente"
}

# Obtener información del ALB
get_alb_info() {
    show_info "Obteniendo información del ALB..."
    
    ALB_ARN=$(aws elbv2 describe-load-balancers --names spainbingo-alb --query 'LoadBalancers[0].LoadBalancerArn' --output text 2>/dev/null || echo "")
    
    if [ -z "$ALB_ARN" ]; then
        show_error "No se pudo encontrar el ALB 'spainbingo-alb'"
        exit 1
    fi
    
    show_success "ALB encontrado: $ALB_ARN"
}

# Crear certificado SSL
create_ssl_certificate() {
    show_info "Creando certificado SSL para $DOMAIN y $WWW_DOMAIN..."
    
    # Verificar si ya existe un certificado
    EXISTING_CERT=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_CERT" ]; then
        show_warning "Certificado SSL ya existe: $EXISTING_CERT"
        CERT_ARN=$EXISTING_CERT
    else
        # Crear nuevo certificado
        CERT_ARN=$(aws acm request-certificate \
            --domain-name $DOMAIN \
            --subject-alternative-names $WWW_DOMAIN \
            --validation-method DNS \
            --query 'CertificateArn' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$CERT_ARN" ]; then
            show_success "Certificado SSL creado: $CERT_ARN"
            show_info "⚠️  IMPORTANTE: Debes validar el certificado en Route 53 o manualmente"
        else
            show_error "No se pudo crear el certificado SSL"
            exit 1
        fi
    fi
}

# Configurar Route 53 (si está disponible)
setup_route53() {
    show_info "Configurando Route 53 para $DOMAIN..."
    
    # Buscar hosted zone
    HOSTED_ZONE_ID=$(aws route53 list-hosted-zones --query "HostedZones[?Name=='$DOMAIN.'].Id" --output text 2>/dev/null || echo "")
    
    if [ -z "$HOSTED_ZONE_ID" ]; then
        show_warning "No se encontró hosted zone para $DOMAIN en Route 53"
        show_info "Debes configurar manualmente los registros DNS:"
        echo ""
        echo "📋 Registros DNS necesarios:"
        echo "   Tipo: A"
        echo "   Nombre: $DOMAIN"
        echo "   Valor: [IP del ALB]"
        echo ""
        echo "   Tipo: A"
        echo "   Nombre: $WWW_DOMAIN"
        echo "   Valor: [IP del ALB]"
        echo ""
        echo "   Tipo: CNAME"
        echo "   Nombre: $WWW_DOMAIN"
        echo "   Valor: $ALB_DNS"
        return
    fi
    
    show_success "Hosted zone encontrada: $HOSTED_ZONE_ID"
    
    # Crear registros DNS
    create_dns_records $HOSTED_ZONE_ID
}

# Crear registros DNS
create_dns_records() {
    local hosted_zone_id=$1
    
    show_info "Creando registros DNS..."
    
    # Obtener IPs del ALB
    ALB_IPS=$(aws elbv2 describe-load-balancers --names spainbingo-alb --query 'LoadBalancers[0].AvailabilityZones[].LoadBalancerAddresses[].IpAddress' --output text)
    
    # Crear archivo de cambio para Route 53
    cat > dns-changes.json << EOF
{
    "Changes": [
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "$DOMAIN",
                "Type": "A",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$(echo $ALB_IPS | cut -d' ' -f1)"
                    }
                ]
            }
        },
        {
            "Action": "UPSERT",
            "ResourceRecordSet": {
                "Name": "$WWW_DOMAIN",
                "Type": "CNAME",
                "TTL": 300,
                "ResourceRecords": [
                    {
                        "Value": "$ALB_DNS"
                    }
                ]
            }
        }
    ]
}
EOF
    
    # Aplicar cambios
    aws route53 change-resource-record-sets --hosted-zone-id $hosted_zone_id --change-batch file://dns-changes.json
    
    show_success "Registros DNS creados/actualizados"
    rm -f dns-changes.json
}

# Configurar HTTPS en el ALB
setup_https() {
    show_info "Configurando HTTPS en el ALB..."
    
    # Obtener ARN del certificado
    CERT_ARN=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='$DOMAIN'].CertificateArn" --output text 2>/dev/null || echo "")
    
    if [ -z "$CERT_ARN" ]; then
        show_warning "No se encontró certificado SSL. Configurando solo HTTP por ahora."
        return
    fi
    
    # Obtener listener HTTP existente
    HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[?Port==`80`].ListenerArn' --output text 2>/dev/null || echo "")
    
    if [ -n "$HTTP_LISTENER_ARN" ]; then
        show_info "Configurando redirección HTTP a HTTPS..."
        
        # Crear listener HTTPS
        HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
            --load-balancer-arn $ALB_ARN \
            --protocol HTTPS \
            --port 443 \
            --certificates CertificateArn=$CERT_ARN \
            --default-actions Type=forward,TargetGroupArn=$(aws elbv2 describe-target-groups --names spainbingo-ec2-tg --query 'TargetGroups[0].TargetGroupArn' --output text) \
            --query 'Listeners[0].ListenerArn' \
            --output text 2>/dev/null || echo "")
        
        if [ -n "$HTTPS_LISTENER_ARN" ]; then
            show_success "Listener HTTPS creado: $HTTPS_LISTENER_ARN"
            
            # Configurar redirección HTTP a HTTPS
            aws elbv2 modify-listener \
                --listener-arn $HTTP_LISTENER_ARN \
                --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}'
            
            show_success "Redirección HTTP a HTTPS configurada"
        fi
    fi
}

# Mostrar información final
show_final_info() {
    echo ""
    show_success "🎉 Configuración del dominio completada"
    echo ""
    show_info "📋 Resumen de configuración:"
    echo "   🌍 Dominio: $DOMAIN"
    echo "   🌍 www: $WWW_DOMAIN"
    echo "   🔗 ALB: $ALB_DNS"
    echo ""
    show_info "🔧 Próximos pasos:"
    echo "   1. Configurar registros DNS en tu proveedor de dominio"
    echo "   2. Validar certificado SSL (si se creó uno nuevo)"
    echo "   3. Probar acceso HTTPS"
    echo ""
    show_info "📋 Registros DNS necesarios:"
    echo "   $DOMAIN → $ALB_DNS (CNAME)"
    echo "   $WWW_DOMAIN → $ALB_DNS (CNAME)"
    echo ""
    show_info "🌐 URLs de la aplicación:"
    echo "   https://$DOMAIN"
    echo "   https://$WWW_DOMAIN"
    echo "   http://$ALB_DNS (fallback)"
}

# Función principal
main() {
    show_info "🚀 Configurando dominio $DOMAIN para SpainBingo"
    echo ""
    
    check_aws_cli
    get_alb_info
    create_ssl_certificate
    setup_route53
    setup_https
    show_final_info
}

# Ejecutar función principal
main "$@" 