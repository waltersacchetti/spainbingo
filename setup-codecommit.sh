#!/bin/bash

# Script para configurar y usar AWS CodeCommit
# Uso: ./setup-codecommit.sh [OPCIÓN]

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
REPO_NAME="spainbingo"
REPO_DESCRIPTION="SpainBingo - Aplicación de Bingo Online"
REGION="eu-west-1"

# Cargar información de la instancia
load_instance_info() {
    if [ ! -f "ec2-info.txt" ]; then
        show_error "Archivo ec2-info.txt no encontrado. Ejecuta primero deploy-ec2.sh"
        exit 1
    fi
    
    source ec2-info.txt
    show_info "Instancia cargada: $INSTANCE_ID"
}

# Verificar AWS CLI
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        show_error "AWS CLI no está instalado"
        exit 1
    fi
    
    # Verificar configuración
    if ! aws sts get-caller-identity &> /dev/null; then
        show_error "AWS CLI no está configurado. Ejecuta 'aws configure'"
        exit 1
    fi
    
    show_success "AWS CLI configurado correctamente"
}

# Crear repositorio en CodeCommit
create_repository() {
    show_info "Creando repositorio en CodeCommit..."
    
    # Verificar si el repositorio ya existe
    if aws codecommit get-repository --repository-name $REPO_NAME --region $REGION &> /dev/null; then
        show_warning "El repositorio '$REPO_NAME' ya existe"
        return 0
    fi
    
    # Crear repositorio
    aws codecommit create-repository \
        --repository-name $REPO_NAME \
        --repository-description "$REPO_DESCRIPTION" \
        --region $REGION
    
    show_success "Repositorio '$REPO_NAME' creado en CodeCommit"
}

# Configurar credenciales Git para CodeCommit
setup_git_credentials() {
    show_info "Configurando credenciales Git para CodeCommit..."
    
    # Instalar git-remote-codecommit si no está instalado
    if ! command -v git-remote-codecommit &> /dev/null; then
        show_info "Instalando git-remote-codecommit..."
        pip3 install git-remote-codecommit
    fi
    
    # Configurar Git global
    git config --global user.name "SpainBingo Deploy"
    git config --global user.email "deploy@spainbingo.es"
    
    show_success "Credenciales Git configuradas"
}

# Configurar repositorio local
setup_local_repo() {
    show_info "Configurando repositorio local..."
    
    # Verificar si ya es un repositorio Git
    if [ -d ".git" ]; then
        show_info "Repositorio Git ya existe, configurando remoto..."
        
        # Agregar remoto CodeCommit
        git remote add codecommit codecommit://$REGION/$REPO_NAME || \
        git remote set-url codecommit codecommit://$REGION/$REPO_NAME
        
        show_success "Remoto CodeCommit configurado"
    else
        show_info "Inicializando repositorio Git..."
        
        # Inicializar repositorio
        git init
        git remote add origin codecommit://$REGION/$REPO_NAME
        
        # Commit inicial
        git add .
        git commit -m "Commit inicial - SpainBingo"
        
        # Push inicial
        git push -u origin main || git push -u origin master
        
        show_success "Repositorio local configurado y sincronizado"
    fi
}

# Configurar CodeCommit en la EC2
setup_ec2_codecommit() {
    load_instance_info
    
    show_info "Configurando CodeCommit en la EC2..."
    
    # Configurar Git en la EC2
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[
            \"cd /var/www/spainbingo\",
            \"git config --global user.name 'SpainBingo Deploy'\",
            \"git config --global user.email 'deploy@spainbingo.es'\",
            \"git config --global pull.rebase false\",
            \"if [ ! -d '.git' ]; then\",
            \"  git init\",
            \"  git remote add origin codecommit://$REGION/$REPO_NAME\",
            \"  git fetch origin\",
            \"  git checkout -b main origin/main || git checkout -b master origin/master\",
            \"else\",
            \"  git remote set-url origin codecommit://$REGION/$REPO_NAME\",
            \"  git fetch origin\",
            \"fi\",
            \"git status\",
            \"echo 'CodeCommit configurado en EC2'\"
        ]" \
        --query 'Command.CommandId' \
        --output text > command_id.txt
    
    command_id=$(cat command_id.txt)
    show_info "Comando ejecutado: $command_id"
    
    # Esperar y mostrar resultado
    sleep 10
    aws ssm get-command-invocation \
        --command-id $command_id \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Crear IAM user para CodeCommit (opcional)
create_iam_user() {
    show_info "Creando usuario IAM para CodeCommit..."
    
    USER_NAME="spainbingo-codecommit"
    
    # Verificar si el usuario ya existe
    if aws iam get-user --user-name $USER_NAME &> /dev/null; then
        show_warning "El usuario IAM '$USER_NAME' ya existe"
        return 0
    fi
    
    # Crear usuario
    aws iam create-user --user-name $USER_NAME
    
    # Crear política para CodeCommit
    cat > codecommit-policy.json << EOF
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "codecommit:*"
            ],
            "Resource": "arn:aws:codecommit:$REGION:*:$REPO_NAME"
        }
    ]
}
EOF
    
    # Crear política
    aws iam create-policy \
        --policy-name CodeCommitPolicy \
        --policy-document file://codecommit-policy.json
    
    # Adjuntar política al usuario
    aws iam attach-user-policy \
        --user-name $USER_NAME \
        --policy-arn arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):policy/CodeCommitPolicy
    
    # Crear access key
    aws iam create-access-key --user-name $USER_NAME > access-key.json
    
    show_success "Usuario IAM '$USER_NAME' creado"
    show_info "Access Key guardada en access-key.json"
    
    # Limpiar archivo temporal
    rm codecommit-policy.json
}

# Mostrar información del repositorio
show_repo_info() {
    show_info "Información del repositorio CodeCommit:"
    
    # Obtener información del repositorio
    aws codecommit get-repository \
        --repository-name $REPO_NAME \
        --region $REGION \
        --query 'repositoryMetadata.{Name:repositoryName,Description:repositoryDescription,CloneUrl:cloneUrlHttp,Arn:Arn}' \
        --output table
}

# Comandos Git útiles
show_git_commands() {
    echo ""
    show_info "Comandos Git útiles para CodeCommit:"
    echo ""
    echo "📝 Desarrollo local:"
    echo "  git add ."
    echo "  git commit -m 'Nueva funcionalidad'"
    echo "  git push origin main"
    echo ""
    echo "🔄 Despliegue a EC2:"
    echo "  ./deploy-update.sh git-pull"
    echo ""
    echo "📊 Ver estado:"
    echo "  git status"
    echo "  git log --oneline -10"
    echo ""
    echo "🌐 URL del repositorio:"
    echo "  https://$REGION.console.aws.amazon.com/codesuite/codecommit/repositories/$REPO_NAME"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./setup-codecommit.sh [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  create-repo     - Crear repositorio en CodeCommit"
    echo "  setup-local     - Configurar repositorio local"
    echo "  setup-ec2       - Configurar CodeCommit en la EC2"
    echo "  create-user     - Crear usuario IAM para CodeCommit"
    echo "  info            - Mostrar información del repositorio"
    echo "  commands        - Mostrar comandos Git útiles"
    echo "  full-setup      - Configuración completa"
    echo "  help            - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./setup-codecommit.sh full-setup"
    echo "  ./setup-codecommit.sh setup-local"
    echo "  ./setup-codecommit.sh info"
    echo ""
    echo "Flujo recomendado:"
    echo "1. ./setup-codecommit.sh full-setup"
    echo "2. Hacer cambios en tu código"
    echo "3. git add . && git commit -m 'Cambios' && git push"
    echo "4. ./deploy-update.sh git-pull"
}

# Función principal
main() {
    case "${1:-help}" in
        "create-repo")
            check_aws_cli
            create_repository
            ;;
        "setup-local")
            check_aws_cli
            setup_git_credentials
            setup_local_repo
            ;;
        "setup-ec2")
            check_aws_cli
            setup_ec2_codecommit
            ;;
        "create-user")
            check_aws_cli
            create_iam_user
            ;;
        "info")
            check_aws_cli
            show_repo_info
            ;;
        "commands")
            show_git_commands
            ;;
        "full-setup")
            check_aws_cli
            create_repository
            setup_git_credentials
            setup_local_repo
            setup_ec2_codecommit
            show_repo_info
            show_git_commands
            show_success "Configuración completa de CodeCommit finalizada"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@" 