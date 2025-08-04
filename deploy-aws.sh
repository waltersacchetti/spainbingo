#!/bin/bash

# Script de Despliegue para AWS - Bingo Spain
# Autor: Bingo Spain Team
# Fecha: 3 de Agosto de 2024

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
BUCKET_NAME="spainbingo.es"
REGION="eu-west-1"
DISTRIBUTION_ID=""
DOMAIN_NAME="spainbingo.es"

echo -e "${BLUE}🚀 Iniciando despliegue de SpainBingo en AWS${NC}"

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
        show_error "AWS CLI no está instalado. Por favor, instálalo primero."
    fi
    
    if ! command -v jq &> /dev/null; then
        show_error "jq no está instalado. Por favor, instálalo primero."
    fi
    
    show_progress "Dependencias verificadas"
}

# Validar archivo JSON
validate_json() {
    local file=$1
    if ! jq empty "$file" 2>/dev/null; then
        show_error "JSON inválido en $file"
        return 1
    fi
    return 0
}

# Verificar configuración de AWS
check_aws_config() {
    echo "🔍 Verificando configuración de AWS..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        show_error "No se puede autenticar con AWS. Verifica tus credenciales."
    fi
    
    show_progress "Configuración de AWS verificada"
}

# Crear bucket S3 si no existe
create_s3_bucket() {
    echo "🪣 Creando bucket S3..."
    
    if aws s3 ls "s3://$BUCKET_NAME" 2>&1 | grep -q 'NoSuchBucket'; then
        aws s3 mb "s3://$BUCKET_NAME" --region $REGION
        show_progress "Bucket S3 creado: $BUCKET_NAME"
    else
        show_warning "Bucket S3 ya existe: $BUCKET_NAME"
    fi
}

# Configurar bucket S3 para hosting web
configure_s3_website() {
    echo "🌐 Configurando hosting web en S3..."
    
    # Crear configuración de website
    cat > website-config.json << 'EOF'
{
    "IndexDocument": {
        "Suffix": "entrada.html"
    },
    "ErrorDocument": {
        "Key": "error.html"
    }
}
EOF
    
    aws s3 website "s3://$BUCKET_NAME" --index-document entrada.html --error-document error.html
    show_progress "Hosting web configurado"
}

# Configurar CORS
configure_cors() {
    echo "🔒 Configurando CORS..."
    
    cat > cors-config.json << 'EOF'
{
    "CORSRules": [
        {
            "AllowedHeaders": ["*"],
            "AllowedMethods": ["GET"],
            "AllowedOrigins": ["*"],
            "ExposeHeaders": []
        }
    ]
}
EOF
    
    # Validar JSON antes de enviarlo
    if validate_json "cors-config.json"; then
        aws s3api put-bucket-cors --bucket $BUCKET_NAME --cors-configuration file://cors-config.json
        show_progress "CORS configurado"
    else
        show_error "Error en la configuración CORS"
        return 1
    fi
}

# Subir archivos al bucket
upload_files() {
    echo "📤 Subiendo archivos al bucket S3..."
    
    # Lista de archivos a subir
    FILES=(
        "entrada.html"
        "welcome.html"
        "welcome-styles.css"
        "welcome-script.js"
        "index.html"
        "styles.css"
        "script.js"
        "security.js"
        "privacy-policy.html"
        "terms.html"
        "README.md"
        "aws-config.json"
    )
    
    for file in "${FILES[@]}"; do
        if [ -f "$file" ]; then
            aws s3 cp "$file" "s3://$BUCKET_NAME/$file" --content-type "text/html" --cache-control "max-age=3600"
            echo "  📄 Subido: $file"
        else
            show_warning "Archivo no encontrado: $file"
        fi
    done
    
    show_progress "Archivos subidos al bucket"
}

# Configurar CloudFront (si se proporciona Distribution ID)
configure_cloudfront() {
    echo "☁️ Configurando CloudFront..."
    
    # Verificar si ya existe una distribución para este bucket
    EXISTING_DISTRIBUTION=$(aws cloudfront list-distributions --query "DistributionList.Items[?Origins.Items[0].DomainName=='$BUCKET_NAME.s3.$REGION.amazonaws.com'].Id" --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_DISTRIBUTION" ] && [ "$EXISTING_DISTRIBUTION" != "None" ]; then
        DISTRIBUTION_ID=$EXISTING_DISTRIBUTION
        show_progress "Distribución CloudFront existente encontrada: $DISTRIBUTION_ID"
    else
        echo "📦 Creando nueva distribución de CloudFront..."
        
        # Crear configuración de distribución
        cat > cloudfront-config.json << 'EOF'
{
    "CallerReference": "spainbingo-distribution",
    "Comment": "SpainBingo Distribution",
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
        "Compress": true
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF
        
        # Reemplazar placeholders
        sed -i.bak "s/BUCKET_PLACEHOLDER/$BUCKET_NAME/g" cloudfront-config.json
        sed -i.bak "s/REGION_PLACEHOLDER/$REGION/g" cloudfront-config.json
        
        # Crear distribución
        DISTRIBUTION_RESPONSE=$(aws cloudfront create-distribution --distribution-config file://cloudfront-config.json 2>/dev/null || echo "")
        
        if [ -n "$DISTRIBUTION_RESPONSE" ]; then
            DISTRIBUTION_ID=$(echo "$DISTRIBUTION_RESPONSE" | jq -r '.Distribution.Id' 2>/dev/null || echo "")
            show_progress "Nueva distribución CloudFront creada: $DISTRIBUTION_ID"
        else
            show_warning "No se pudo crear la distribución CloudFront"
            return 0
        fi
    fi
    
    # Invalidar caché si tenemos un Distribution ID
    if [ -n "$DISTRIBUTION_ID" ] && [ "$DISTRIBUTION_ID" != "None" ]; then
        echo "🔄 Invalidando caché de CloudFront..."
        aws cloudfront create-invalidation \
            --distribution-id $DISTRIBUTION_ID \
            --paths "/*" > /dev/null 2>&1
        
        show_progress "Invalidación de CloudFront creada"
        
        # Mostrar información de la distribución
        DISTRIBUTION_DOMAIN=$(aws cloudfront get-distribution --id $DISTRIBUTION_ID --query 'Distribution.DomainName' --output text 2>/dev/null || echo "")
        if [ -n "$DISTRIBUTION_DOMAIN" ]; then
            echo -e "${BLUE}🌐 URL de CloudFront: https://$DISTRIBUTION_DOMAIN${NC}"
        fi
    fi
}

# Configurar WAF (Web Application Firewall)
configure_waf() {
    echo "🛡️ Configurando WAF..."
    
    # Crear Web ACL
    cat > waf-web-acl.json << 'EOF'
{
    "Name": "SpainBingo-WAF",
    "Description": "WAF para SpainBingo",
    "Scope": "REGIONAL",
    "DefaultAction": {
        "Allow": {}
    },
    "Rules": [
        {
            "Name": "RateLimit",
            "Priority": 1,
            "Action": {
                "Block": {}
            },
            "Statement": {
                "RateBasedStatement": {
                    "Limit": 2000,
                    "AggregateKeyType": "IP"
                }
            },
            "VisibilityConfig": {
                "SampledRequestsEnabled": true,
                "CloudWatchMetricsEnabled": true,
                "MetricName": "RateLimitRule"
            }
        }
    ],
    "VisibilityConfig": {
        "SampledRequestsEnabled": true,
        "CloudWatchMetricsEnabled": true,
        "MetricName": "SpainBingoWAF"
    }
}
EOF
    
    show_progress "Configuración de WAF preparada"
}

# Configurar monitoreo con CloudWatch
configure_monitoring() {
    echo "📊 Configurando monitoreo..."
    
    # Crear dashboard de CloudWatch
    cat > cloudwatch-dashboard.json << 'EOF'
{
    "DashboardName": "SpainBingo-Dashboard",
    "DashboardBody": "{\"widgets\":[{\"type\":\"metric\",\"properties\":{\"metrics\":[[\"AWS/S3\",\"NumberOfObjects\",\"BucketName\",\"BUCKET_PLACEHOLDER\"]],\"period\":300,\"stat\":\"Average\",\"region\":\"REGION_PLACEHOLDER\",\"title\":\"S3 Objects\"}]}]}"
}
EOF
    
    # Reemplazar placeholders con valores reales
    sed -i.bak "s/BUCKET_PLACEHOLDER/$BUCKET_NAME/g" cloudwatch-dashboard.json
    sed -i.bak "s/REGION_PLACEHOLDER/$REGION/g" cloudwatch-dashboard.json
    
    show_progress "Configuración de monitoreo preparada"
}

# Verificar despliegue
verify_deployment() {
    echo "🔍 Verificando despliegue..."
    
    # Obtener URL del bucket
    BUCKET_URL=$(aws s3api get-bucket-website --bucket $BUCKET_NAME --query 'WebsiteEndpoint' --output text)
    
    echo -e "${GREEN}🎉 Despliegue completado exitosamente!${NC}"
    echo -e "${BLUE}🌐 URL del sitio: http://$BUCKET_URL${NC}"
    
    if [ -n "$DISTRIBUTION_ID" ]; then
        echo -e "${BLUE}☁️  CloudFront configurado${NC}"
    fi
    
    show_progress "Despliegue verificado"
}

# Limpiar archivos temporales
cleanup() {
    echo "🧹 Limpiando archivos temporales..."
    
    rm -f website-config.json
    rm -f cors-config.json
    rm -f waf-web-acl.json
    rm -f cloudwatch-dashboard.json
    rm -f cloudfront-config.json
    rm -f cloudfront-config.json.bak
    
    show_progress "Limpieza completada"
}

# Función principal
main() {
    echo -e "${BLUE}🚀 Iniciando despliegue de Bingo Spain en AWS${NC}"
    echo "=================================================="
    
    check_dependencies
    check_aws_config
    create_s3_bucket
    configure_s3_website
    configure_cors
    upload_files
    configure_cloudfront
    configure_waf
    configure_monitoring
    verify_deployment
    cleanup
    
    echo "=================================================="
    echo -e "${GREEN}🎉 ¡Despliegue completado exitosamente!${NC}"
    echo -e "${YELLOW}📝 Recuerda configurar tu dominio personalizado y certificado SSL${NC}"
}

# Ejecutar función principal
main "$@" 