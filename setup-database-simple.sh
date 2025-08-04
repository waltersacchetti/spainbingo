#!/bin/bash

# Script simplificado para configurar base de datos PostgreSQL en AWS RDS
# Uso: ./setup-database-simple.sh

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

# Configuración de la base de datos
DB_INSTANCE_IDENTIFIER="spainbingo-db"
DB_NAME="spainbingo"
DB_USERNAME="spainbingo_admin"
DB_PASSWORD="SpainBingo2024!"
DB_INSTANCE_CLASS="db.t3.micro"
DB_ENGINE="postgres"
DB_ENGINE_VERSION="13.12"
DB_ALLOCATED_STORAGE="20"
DB_STORAGE_TYPE="gp2"

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

# Crear instancia de base de datos
create_database() {
    show_info "Creando instancia de base de datos PostgreSQL..."
    
    # Obtener VPC ID
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    show_info "VPC ID: $VPC_ID"
    
    # Obtener subnets
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text)
    show_info "Subnets: $SUBNET_IDS"
    
    # Crear instancia RDS con configuración mínima
    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --db-instance-class $DB_INSTANCE_CLASS \
        --engine $DB_ENGINE \
        --master-username $DB_USERNAME \
        --master-user-password $DB_PASSWORD \
        --allocated-storage $DB_ALLOCATED_STORAGE \
        --storage-type $DB_STORAGE_TYPE \
        --db-name $DB_NAME \
        --backup-retention-period 7 \
        --storage-encrypted \
        --tags Key=Project,Value=SpainBingo Key=Environment,Value=Production
    
    show_success "Instancia de base de datos creada: $DB_INSTANCE_IDENTIFIER"
    show_info "La base de datos tardará unos 5-10 minutos en estar disponible"
}

# Esperar a que la base de datos esté disponible
wait_for_database() {
    show_info "Esperando a que la base de datos esté disponible..."
    
    while true; do
        STATUS=$(aws rds describe-db-instances \
            --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
            --query 'DBInstances[0].DBInstanceStatus' \
            --output text 2>/dev/null || echo "creating")
        
        if [ "$STATUS" = "available" ]; then
            show_success "Base de datos disponible"
            break
        fi
        
        show_info "Estado: $STATUS - Esperando..."
        sleep 30
    done
}

# Obtener endpoint de la base de datos
get_database_endpoint() {
    show_info "Obteniendo endpoint de la base de datos..."
    
    ENDPOINT=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --query 'DBInstances[0].Endpoint.Address' \
        --output text)
    
    PORT=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --query 'DBInstances[0].Endpoint.Port' \
        --output text)
    
    show_success "Endpoint: $ENDPOINT:$PORT"
    
    # Guardar información en archivo
    cat > db-info.txt << EOF
# Información de la Base de Datos SpainBingo
DB_INSTANCE_IDENTIFIER=$DB_INSTANCE_IDENTIFIER
DB_NAME=$DB_NAME
DB_USERNAME=$DB_USERNAME
DB_PASSWORD=$DB_PASSWORD
DB_ENDPOINT=$ENDPOINT
DB_PORT=$PORT
DB_CONNECTION_STRING=postgresql://$DB_USERNAME:$DB_PASSWORD@$ENDPOINT:$PORT/$DB_NAME
EOF
    
    show_success "Información guardada en db-info.txt"
}

# Función principal
main() {
    show_info "🚀 Configurando base de datos PostgreSQL para SpainBingo..."
    
    check_aws_cli
    create_database
    wait_for_database
    get_database_endpoint
    
    show_success "🎉 Configuración de base de datos completada"
    show_info "Próximos pasos:"
    echo "1. Configurar PostgreSQL client en EC2: ./setup-postgres-client.sh"
    echo "2. Instalar dependencias en EC2: npm install"
    echo "3. Probar conexión a la base de datos"
}

# Ejecutar función principal
main "$@" 