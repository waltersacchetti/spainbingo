#!/bin/bash

# Script para instalar y configurar PostgreSQL client en EC2
# Uso: ./setup-postgres-client.sh

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
        show_error "Archivo db-info.txt no encontrado. Ejecuta primero setup-database.sh"
        exit 1
    fi
    
    source db-info.txt
    show_info "Base de datos cargada: $DB_INSTANCE_IDENTIFIER"
}

# Instalar PostgreSQL client en EC2
install_postgres_client() {
    show_info "Instalando PostgreSQL client en EC2..."
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "sudo yum update -y",
            "sudo yum install -y postgresql15 postgresql15-contrib",
            "echo \"PostgreSQL client instalado correctamente\""
        ]' \
        --query 'Command.CommandId' \
        --output text > command_id.txt
    
    command_id=$(cat command_id.txt)
    show_info "Comando ejecutado: $command_id"
    
    # Esperar y mostrar resultado
    sleep 30
    aws ssm get-command-invocation \
        --command-id $command_id \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
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

# Crear archivo de configuración de base de datos
create_database_config() {
    show_info "Creando archivo de configuración de base de datos..."
    
    # Crear archivo de configuración para Node.js
    cat > database-config.js << EOF
// Configuración de base de datos para SpainBingo
module.exports = {
    development: {
        host: '$DB_ENDPOINT',
        port: $DB_PORT,
        database: '$DB_NAME',
        username: '$DB_USERNAME',
        password: '$DB_PASSWORD',
        dialect: 'postgres',
        logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    },
    production: {
        host: '$DB_ENDPOINT',
        port: $DB_PORT,
        database: '$DB_NAME',
        username: '$DB_USERNAME',
        password: '$DB_PASSWORD',
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
        },
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
};
EOF
    
    show_success "Archivo de configuración creado: database-config.js"
}

# Función principal
main() {
    show_info "🔧 Configurando PostgreSQL client en EC2..."
    
    load_instance_info
    load_database_info
    install_postgres_client
    test_database_connection
    execute_database_schema
    create_database_config
    
    show_success "🎉 Configuración de PostgreSQL completada"
    show_info "Próximos pasos:"
    echo "1. Actualizar package.json con dependencias de PostgreSQL"
    echo "2. Crear modelos de base de datos"
    echo "3. Actualizar la aplicación para usar la base de datos"
}

# Ejecutar función principal
main "$@" 