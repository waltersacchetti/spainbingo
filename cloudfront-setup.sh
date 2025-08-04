#!/bin/bash

# Script de Configuración CloudFront para SpainBingo
# Autor: SpainBingo Team
# Fecha: 3 de Agosto de 2024

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BUCKET_NAME="spainbingo-static"
REGION="eu-west-1"

echo -e "${BLUE}☁️ Configurando CloudFront para SpainBingo${NC}"

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

# Verificar que el bucket S3 existe
check_s3_bucket() {
    echo "🪣 Verificando bucket S3..."
    
    if ! aws s3 ls "s3://$BUCKET_NAME" &> /dev/null; then
        show_error "El bucket S3 '$BUCKET_NAME' no existe. Crea el bucket primero."
    fi
    
    show_progress "Bucket S3 verificado: $BUCKET_NAME"
}

# Buscar distribución existente
find_existing_distribution() {
    echo "🔍 Buscando distribución CloudFront existente..."
    
    # Buscar distribuciones que usen este bucket como origen
    DISTRIBUTIONS=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET_NAME.s3.$REGION.amazonaws.com']" --output json 2>/dev/null || echo "[]")
    
    if [ "$(echo "$DISTRIBUTIONS" | jq '. | length')" -gt 0 ]; then
        DISTRIBUTION_ID=$(echo "$DISTRIBUTIONS" | jq -r '.[0].Id')
        DISTRIBUTION_DOMAIN=$(echo "$DISTRIBUTIONS" | jq -r '.[0].DomainName')
        show_progress "Distribución existente encontrada: $DISTRIBUTION_ID"
        echo -e "${BLUE}🌐 URL: https://$DISTRIBUTION_DOMAIN${NC}"
        return 0
    else
        show_warning "No se encontró distribución existente"
        return 1
    fi
}

# Crear nueva distribución
create_new_distribution() {
    echo "📦 Creando nueva distribución de CloudFront..."
    
    # Crear configuración de distribución
    cat > cloudfront-config.json << 'EOF'
{
    "CallerReference": "spainbingo-distribution-2024",
    "Comment": "SpainBingo Distribution - Bingo Online",
    "DefaultRootObject": "entrada.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-spainbingo-static",
                "DomainName": "BUCKET_PLACEHOLDER.s3.REGION_PLACEHOLDER.amazonaws.com",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-spainbingo-static",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "Compress": true,
        "SmoothStreaming": false,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100",
    "HttpVersion": "http2",
    "IsIPV6Enabled": true
}
EOF
    
    # Reemplazar placeholders
    sed -i.bak "s/BUCKET_PLACEHOLDER/$BUCKET_NAME/g" cloudfront-config.json
    sed -i.bak "s/REGION_PLACEHOLDER/$REGION/g" cloudfront-config.json
    
    # Crear distribución
    echo "⏳ Creando distribución (esto puede tomar varios minutos)..."
    DISTRIBUTION_RESPONSE=$(aws cloudfront create-distribution --distribution-config file://cloudfront-config.json)
    
    if [ $? -eq 0 ]; then
        DISTRIBUTION_ID=$(echo "$DISTRIBUTION_RESPONSE" | jq -r '.Distribution.Id')
        DISTRIBUTION_DOMAIN=$(echo "$DISTRIBUTION_RESPONSE" | jq -r '.Distribution.DomainName')
        show_progress "Nueva distribución creada: $DISTRIBUTION_ID"
        echo -e "${BLUE}🌐 URL: https://$DISTRIBUTION_DOMAIN${NC}"
        
        # Guardar información de la distribución
        echo "DISTRIBUTION_ID=$DISTRIBUTION_ID" > cloudfront-info.txt
        echo "DISTRIBUTION_DOMAIN=$DISTRIBUTION_DOMAIN" >> cloudfront-info.txt
        
        show_progress "Información guardada en cloudfront-info.txt"
    else
        show_error "Error al crear la distribución CloudFront"
    fi
}

# Invalidar caché
invalidate_cache() {
    if [ -n "$DISTRIBUTION_ID" ]; then
        echo "🔄 Invalidando caché de CloudFront..."
        
        INVALIDATION_RESPONSE=$(aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*")
        
        if [ $? -eq 0 ]; then
            INVALIDATION_ID=$(echo "$INVALIDATION_RESPONSE" | jq -r '.Invalidation.Id')
            show_progress "Invalidación creada: $INVALIDATION_ID"
        else
            show_warning "Error al crear invalidación"
        fi
    fi
}

# Mostrar información de la distribución
show_distribution_info() {
    if [ -n "$DISTRIBUTION_ID" ]; then
        echo ""
        echo "📊 Información de la Distribución:"
        echo "=================================="
        echo "ID: $DISTRIBUTION_ID"
        echo "Dominio: $DISTRIBUTION_DOMAIN"
        echo "URL: https://$DISTRIBUTION_DOMAIN"
        echo "Estado: Habilitada"
        echo "Precio: PriceClass_100 (Europa y Norteamérica)"
        echo "HTTP/2: Habilitado"
        echo "IPv6: Habilitado"
        echo ""
    fi
}

# Función principal
main() {
    echo -e "${BLUE}☁️ Configurando CloudFront para SpainBingo${NC}"
    echo "=================================================="
    
    check_dependencies
    check_aws_config
    check_s3_bucket
    
    if find_existing_distribution; then
        echo "✅ Usando distribución existente"
    else
        create_new_distribution
    fi
    
    invalidate_cache
    show_distribution_info
    
    echo "=================================================="
    echo -e "${GREEN}🎉 Configuración de CloudFront completada${NC}"
    echo -e "${YELLOW}📝 La distribución puede tardar 10-15 minutos en estar completamente activa${NC}"
    
    # Limpiar archivos temporales
    rm -f cloudfront-config.json cloudfront-config.json.bak
}

# Ejecutar función principal
main "$@" 