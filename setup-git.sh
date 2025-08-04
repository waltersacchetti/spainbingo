#!/bin/bash

# Script para configurar Git en la EC2
# Uso: ./setup-git.sh [REPO_URL]

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

# Configurar Git en la EC2
setup_git() {
    local repo_url="${1:-}"
    
    if [ -z "$repo_url" ]; then
        show_error "Debes proporcionar la URL del repositorio Git"
        echo "Uso: ./setup-git.sh https://github.com/usuario/repositorio.git"
        exit 1
    fi
    
    show_info "Configurando Git en la EC2..."
    show_info "Repositorio: $repo_url"
    
    # Configurar Git en la EC2
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[
            \"cd /var/www/spainbingo\",
            \"git config --global user.name 'SpainBingo Deploy'\",
            \"git config --global user.email 'deploy@spainbingo.es'\",
            \"git config --global pull.rebase false\",
            \"git remote -v\",
            \"if [ ! -d '.git' ]; then\",
            \"  git init\",
            \"  git remote add origin $repo_url\",
            \"  git fetch origin\",
            \"  git checkout -b main origin/main || git checkout -b master origin/master\",
            \"else\",
            \"  git remote set-url origin $repo_url\",
            \"  git fetch origin\",
            \"fi\",
            \"git status\",
            \"echo 'Git configurado correctamente'\"
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

# Configurar SSH key para Git (opcional)
setup_ssh_key() {
    show_info "Configurando SSH key para Git..."
    
    # Verificar si existe la clave SSH
    if [ ! -f ~/.ssh/id_rsa ]; then
        show_warning "No se encontró clave SSH. Creando una nueva..."
        ssh-keygen -t rsa -b 4096 -C "deploy@spainbingo.es" -f ~/.ssh/id_rsa -N ""
    fi
    
    # Mostrar la clave pública
    show_info "Clave pública SSH:"
    cat ~/.ssh/id_rsa.pub
    
    show_info "Copia esta clave y agrégala a tu repositorio Git (GitHub/GitLab)"
    show_info "Luego ejecuta: ./setup-git.sh [REPO_URL]"
}

# Función principal
main() {
    case "${1:-help}" in
        "ssh")
            load_instance_info
            setup_ssh_key
            ;;
        "help"|*)
            if [ "$1" = "help" ] || [ -z "$1" ]; then
                echo "Uso: ./setup-git.sh [OPCIÓN]"
                echo ""
                echo "Opciones:"
                echo "  [REPO_URL]  - Configurar Git con el repositorio especificado"
                echo "  ssh         - Configurar SSH key para Git"
                echo "  help        - Mostrar esta ayuda"
                echo ""
                echo "Ejemplos:"
                echo "  ./setup-git.sh https://github.com/usuario/spainbingo.git"
                echo "  ./setup-git.sh ssh"
                echo ""
                echo "Pasos recomendados:"
                echo "1. ./setup-git.sh ssh"
                echo "2. Agregar la clave SSH a tu repositorio"
                echo "3. ./setup-git.sh https://github.com/usuario/spainbingo.git"
                echo "4. ./deploy-update.sh git-pull"
            else
                load_instance_info
                setup_git "$1"
            fi
            ;;
    esac
}

# Ejecutar función principal
main "$@" 