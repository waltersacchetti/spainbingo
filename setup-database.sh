#!/bin/bash

# Script para configurar base de datos PostgreSQL en AWS RDS
# Uso: ./setup-database.sh

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
DB_ENGINE_VERSION="15.4"
DB_ALLOCATED_STORAGE="20"
DB_STORAGE_TYPE="gp2"
DB_SUBNET_GROUP_NAME="spainbingo-db-subnet-group"
DB_SECURITY_GROUP_NAME="spainbingo-db-sg"
DB_PARAMETER_GROUP_NAME="spainbingo-db-params"

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

# Crear Subnet Group para RDS
create_subnet_group() {
    show_info "Verificando Subnet Group para RDS..."
    
    # Verificar si ya existe
    if aws rds describe-db-subnet-groups --db-subnet-group-names $DB_SUBNET_GROUP_NAME &>/dev/null; then
        show_info "Subnet Group ya existe: $DB_SUBNET_GROUP_NAME"
        return 0
    fi
    
    # Obtener VPC ID y Subnets
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    SUBNET_IDS=$(aws ec2 describe-subnets --filters "Name=vpc-id,Values=$VPC_ID" --query 'Subnets[*].SubnetId' --output text)
    
    # Crear Subnet Group
    aws rds create-db-subnet-group \
        --db-subnet-group-name $DB_SUBNET_GROUP_NAME \
        --db-subnet-group-description "Subnet group for SpainBingo database" \
        --subnet-ids $SUBNET_IDS \
        --query 'DBSubnetGroup.DBSubnetGroupName' \
        --output text
    
    show_success "Subnet Group creado: $DB_SUBNET_GROUP_NAME"
}

# Crear Security Group para RDS
create_security_group() {
    show_info "Verificando Security Group para RDS..."
    
    # Obtener VPC ID
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    
    # Verificar si ya existe
    EXISTING_SG=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=$DB_SECURITY_GROUP_NAME" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")
    
    if [ -n "$EXISTING_SG" ] && [ "$EXISTING_SG" != "None" ]; then
        show_info "Security Group ya existe: $EXISTING_SG"
        SG_ID=$EXISTING_SG
        return 0
    fi
    
    # Crear Security Group
    SG_ID=$(aws ec2 create-security-group \
        --group-name $DB_SECURITY_GROUP_NAME \
        --description "Security group for SpainBingo database" \
        --vpc-id $VPC_ID \
        --query 'GroupId' \
        --output text)
    
    # Permitir acceso desde EC2 (usar CIDR por defecto si no encuentra el SG)
    EC2_SG_ID=$(aws ec2 describe-security-groups --filters "Name=group-name,Values=spainbingo-ec2-sg" --query 'SecurityGroups[0].GroupId' --output text 2>/dev/null || echo "")
    
    if [ -n "$EC2_SG_ID" ] && [ "$EC2_SG_ID" != "None" ]; then
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 5432 \
            --source-group $EC2_SG_ID
        show_info "Acceso configurado desde Security Group EC2: $EC2_SG_ID"
    else
        # Si no encuentra el SG, permitir acceso desde cualquier IP de la VPC
        VPC_CIDR=$(aws ec2 describe-vpcs --vpc-ids $VPC_ID --query 'Vpcs[0].CidrBlock' --output text)
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 5432 \
            --cidr $VPC_CIDR
        show_info "Acceso configurado desde VPC CIDR: $VPC_CIDR"
    fi
    
    show_success "Security Group creado: $SG_ID"
}

# Crear Parameter Group
create_parameter_group() {
    show_info "Verificando Parameter Group para RDS..."
    
    # Verificar si ya existe
    if aws rds describe-db-parameter-groups --db-parameter-group-names $DB_PARAMETER_GROUP_NAME &>/dev/null; then
        show_info "Parameter Group ya existe: $DB_PARAMETER_GROUP_NAME"
        return 0
    fi
    
    aws rds create-db-parameter-group \
        --db-parameter-group-name $DB_PARAMETER_GROUP_NAME \
        --db-parameter-group-family "postgres15" \
        --description "Parameter group for SpainBingo database"
    
    show_success "Parameter Group creado: $DB_PARAMETER_GROUP_NAME"
}

# Crear instancia de base de datos
create_database() {
    show_info "Verificando instancia de base de datos PostgreSQL..."
    
    # Verificar si ya existe
    if aws rds describe-db-instances --db-instance-identifier $DB_INSTANCE_IDENTIFIER &>/dev/null; then
        show_info "Instancia de base de datos ya existe: $DB_INSTANCE_IDENTIFIER"
        return 0
    fi
    
    # Obtener VPC ID
    VPC_ID=$(aws ec2 describe-vpcs --filters "Name=is-default,Values=true" --query 'Vpcs[0].VpcId' --output text)
    
    # Crear instancia RDS
    aws rds create-db-instance \
        --db-instance-identifier $DB_INSTANCE_IDENTIFIER \
        --db-instance-class $DB_INSTANCE_CLASS \
        --engine $DB_ENGINE \
        --engine-version $DB_ENGINE_VERSION \
        --master-username $DB_USERNAME \
        --master-user-password $DB_PASSWORD \
        --allocated-storage $DB_ALLOCATED_STORAGE \
        --storage-type $DB_STORAGE_TYPE \
        --db-name $DB_NAME \
        --db-subnet-group-name $DB_SUBNET_GROUP_NAME \
        --vpc-security-group-ids $(aws ec2 describe-security-groups --filters "Name=group-name,Values=$DB_SECURITY_GROUP_NAME" --query 'SecurityGroups[0].GroupId' --output text) \
        --db-parameter-group-name $DB_PARAMETER_GROUP_NAME \
        --backup-retention-period 7 \
        --preferred-backup-window "03:00-04:00" \
        --preferred-maintenance-window "sun:04:00-sun:05:00" \
        --storage-encrypted \
        --deletion-protection \
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
            --output text)
        
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

# Crear tablas de la base de datos
create_tables() {
    show_info "Creando tablas de la base de datos..."
    
    # Crear archivo SQL con las tablas
    cat > database-schema.sql << 'EOF'
-- Esquema de base de datos para SpainBingo

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    phone VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Spain',
    city VARCHAR(50),
    postal_code VARCHAR(10),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    self_exclusion BOOLEAN DEFAULT FALSE,
    self_exclusion_until DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de sesiones
CREATE TABLE IF NOT EXISTS sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bonus', 'game_win', 'game_loss')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de cartones de bingo
CREATE TABLE IF NOT EXISTS bingo_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_numbers INTEGER[][] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    game_id VARCHAR(50)
);

-- Tabla de juegos
CREATE TABLE IF NOT EXISTS games (
    id SERIAL PRIMARY KEY,
    game_type VARCHAR(20) DEFAULT 'bingo',
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    called_numbers INTEGER[],
    winner_user_id INTEGER REFERENCES users(id),
    prize_amount DECIMAL(10,2),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);

-- Tabla de auditoría
CREATE TABLE IF NOT EXISTS audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_bingo_cards_user_id ON bingo_cards(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_created_at ON audit_log(created_at);

-- Función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EOF
    
    show_success "Esquema de base de datos creado en database-schema.sql"
}

# Función principal
main() {
    show_info "🚀 Configurando base de datos PostgreSQL para SpainBingo..."
    
    check_aws_cli
    create_subnet_group
    create_security_group
    create_parameter_group
    create_database
    wait_for_database
    get_database_endpoint
    create_tables
    
    show_success "🎉 Configuración de base de datos completada"
    show_info "Próximos pasos:"
    echo "1. Instalar dependencias de PostgreSQL en el servidor"
    echo "2. Ejecutar el esquema de base de datos"
    echo "3. Actualizar la aplicación para usar la base de datos"
}

# Ejecutar función principal
main "$@" 