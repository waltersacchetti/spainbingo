#!/bin/bash

# Script para configurar acceso a la base de datos desde EC2
# Uso: ./configure-db-access.sh

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

# Cargar información de la instancia
load_instance_info() {
    if [ ! -f "ec2-info.txt" ]; then
        show_error "Archivo ec2-info.txt no encontrado. Ejecuta primero deploy-ec2.sh"
        exit 1
    fi
    
    source ec2-info.txt
    show_info "Instancia cargada: $INSTANCE_ID"
}

# Cargar información de la base de datos
load_database_info() {
    if [ ! -f "db-info.txt" ]; then
        show_error "Archivo db-info.txt no encontrado. Ejecuta primero setup-database-simple.sh"
        exit 1
    fi
    
    source db-info.txt
    show_info "Base de datos cargada: $DB_INSTANCE_IDENTIFIER"
}

# Obtener Security Group de la EC2
get_ec2_security_group() {
    show_info "Obteniendo Security Group de la EC2..."
    
    EC2_SG_ID=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].SecurityGroups[0].GroupId' \
        --output text)
    
    show_success "Security Group de EC2: $EC2_SG_ID"
}

# Obtener Security Group de la base de datos
get_db_security_group() {
    show_info "Obteniendo Security Group de la base de datos..."
    
    DB_SG_ID=$(aws rds describe-db-instances \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
        --output text)
    
    show_success "Security Group de DB: $DB_SG_ID"
}

# Configurar acceso desde EC2 a la base de datos
configure_db_access() {
    show_info "Configurando acceso desde EC2 a la base de datos..."
    
    # Verificar si la regla ya existe
    EXISTING_RULE=$(aws ec2 describe-security-groups \
        --group-ids $DB_SG_ID \
        --query "SecurityGroups[0].IpPermissions[?FromPort==\`5432\` && ToPort==\`5432\` && IpProtocol==\`tcp\`]" \
        --output text)
    
    if [ -n "$EXISTING_RULE" ]; then
        show_info "Regla de acceso ya existe"
        return 0
    fi
    
    # Agregar regla para permitir acceso desde EC2
    aws ec2 authorize-security-group-ingress \
        --group-id $DB_SG_ID \
        --protocol tcp \
        --port 5432 \
        --source-group $EC2_SG_ID
    
    show_success "Acceso configurado desde EC2 a la base de datos"
}

# Probar conexión a la base de datos
test_database_connection() {
    show_info "Probando conexión a la base de datos..."
    
    # Crear script de prueba
    cat > test-db-connection.sql << EOF
-- Script de prueba de conexión
SELECT version();
SELECT current_database();
SELECT current_user;
SELECT inet_server_addr() as server_address;
SELECT inet_server_port() as server_port;
EOF
    
    # Copiar script a EC2
    scp -i spainbingo-key.pem test-db-connection.sql ec2-user@$PUBLIC_IP:/tmp/
    
    # Ejecutar prueba
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP "PGPASSWORD='$DB_PASSWORD' psql -h $DB_ENDPOINT -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -f /tmp/test-db-connection.sql"
    
    show_success "Conexión a base de datos probada exitosamente"
}

# Ejecutar esquema de base de datos
execute_database_schema() {
    show_info "Ejecutando esquema de base de datos..."
    
    # Copiar esquema a EC2
    scp -i spainbingo-key.pem database-schema.sql ec2-user@$PUBLIC_IP:/tmp/
    
    # Ejecutar esquema
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP "PGPASSWORD='$DB_PASSWORD' psql -h $DB_ENDPOINT -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -f /tmp/database-schema.sql"
    
    show_success "Esquema de base de datos ejecutado exitosamente"
}

# Función principal
main() {
    show_info "🔧 Configurando acceso a la base de datos..."
    
    load_instance_info
    load_database_info
    get_ec2_security_group
    get_db_security_group
    configure_db_access
    test_database_connection
    execute_database_schema
    
    show_success "🎉 Configuración de acceso completada"
    show_info "Próximos pasos:"
    echo "1. Instalar dependencias en EC2: npm install"
    echo "2. Actualizar variables de entorno"
    echo "3. Probar la aplicación con la base de datos"
}

# Ejecutar función principal
main "$@" 