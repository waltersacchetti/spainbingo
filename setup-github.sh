#!/bin/bash

# Script para configurar GitHub con SpainBingo
# Uso: ./setup-github.sh [OPCIÓN]

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

# Cargar información de la instancia
load_instance_info() {
    if [ ! -f "ec2-info.txt" ]; then
        show_error "Archivo ec2-info.txt no encontrado. Ejecuta primero deploy-ec2.sh"
        exit 1
    fi
    
    source ec2-info.txt
    show_info "Instancia cargada: $INSTANCE_ID"
}

# Verificar Git
check_git() {
    if ! command -v git &> /dev/null; then
        show_error "Git no está instalado"
        exit 1
    fi
    
    show_success "Git está instalado: $(git --version)"
}

# Configurar Git global
setup_git_config() {
    show_info "Configurando Git global..."
    
    # Configurar usuario Git
    git config --global user.name "SpainBingo Deploy"
    git config --global user.email "deploy@spainbingo.es"
    
    # Configurar editor (opcional)
    git config --global core.editor "nano"
    
    # Configurar pull strategy
    git config --global pull.rebase false
    
    show_success "Git configurado correctamente"
}

# Configurar SSH key para GitHub
setup_ssh_key() {
    show_info "Configurando SSH key para GitHub..."
    
    # Verificar si existe la clave SSH
    if [ ! -f ~/.ssh/id_rsa ]; then
        show_info "Creando nueva clave SSH..."
        ssh-keygen -t rsa -b 4096 -C "deploy@spainbingo.es" -f ~/.ssh/id_rsa -N ""
    fi
    
    # Iniciar ssh-agent
    eval "$(ssh-agent -s)"
    ssh-add ~/.ssh/id_rsa
    
    # Mostrar la clave pública
    show_info "Clave pública SSH:"
    echo ""
    cat ~/.ssh/id_rsa.pub
    echo ""
    
    show_warning "Pasos para completar la configuración:"
    echo "1. Copia la clave SSH mostrada arriba"
    echo "2. Ve a GitHub.com → Settings → SSH and GPG keys"
    echo "3. Haz clic en 'New SSH key'"
    echo "4. Pega la clave y guárdala"
    echo "5. Ejecuta: ./setup-github.sh setup-repo [TU_USUARIO]"
}

# Configurar repositorio local
setup_local_repo() {
    local github_user="${1:-}"
    
    if [ -z "$github_user" ]; then
        show_error "Debes proporcionar tu usuario de GitHub"
        echo "Uso: ./setup-github.sh setup-repo [TU_USUARIO_GITHUB]"
        exit 1
    fi
    
    show_info "Configurando repositorio local..."
    show_info "Usuario GitHub: $github_user"
    
    # Verificar si ya es un repositorio Git
    if [ -d ".git" ]; then
        show_info "Repositorio Git ya existe, configurando remoto..."
        
        # Agregar remoto GitHub
        git remote add origin git@github.com:$github_user/$REPO_NAME.git || \
        git remote set-url origin git@github.com:$github_user/$REPO_NAME.git
        
        show_success "Remoto GitHub configurado"
    else
        show_info "Inicializando repositorio Git..."
        
        # Inicializar repositorio
        git init
        git remote add origin git@github.com:$github_user/$REPO_NAME.git
        
        # Commit inicial
        git add .
        git commit -m "Commit inicial - SpainBingo"
        
        # Push inicial
        git push -u origin main || git push -u origin master
        
        show_success "Repositorio local configurado y sincronizado"
    fi
}

# Configurar GitHub en la EC2
setup_ec2_github() {
    local github_user="${1:-}"
    
    if [ -z "$github_user" ]; then
        show_error "Debes proporcionar tu usuario de GitHub"
        echo "Uso: ./setup-github.sh setup-ec2 [TU_USUARIO_GITHUB]"
        exit 1
    fi
    
    load_instance_info
    
    show_info "Configurando GitHub en la EC2..."
    show_info "Usuario GitHub: $github_user"
    
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
            \"  git remote add origin git@github.com:$github_user/$REPO_NAME.git\",
            \"  git fetch origin\",
            \"  git checkout -b main origin/main || git checkout -b master origin/master\",
            \"else\",
            \"  git remote set-url origin git@github.com:$github_user/$REPO_NAME.git\",
            \"  git fetch origin\",
            \"fi\",
            \"git status\",
            \"echo 'GitHub configurado en EC2'\"
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

# Crear repositorio en GitHub (usando GitHub CLI)
create_github_repo() {
    local github_user="${1:-}"
    
    if [ -z "$github_user" ]; then
        show_error "Debes proporcionar tu usuario de GitHub"
        echo "Uso: ./setup-github.sh create-repo [TU_USUARIO_GITHUB]"
        exit 1
    fi
    
    show_info "Creando repositorio en GitHub..."
    show_info "Usuario: $github_user"
    show_info "Repositorio: $REPO_NAME"
    
    # Verificar si GitHub CLI está instalado
    if ! command -v gh &> /dev/null; then
        show_warning "GitHub CLI no está instalado"
        show_info "Instalando GitHub CLI..."
        
        # Instalar GitHub CLI (macOS)
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install gh
        else
            show_error "Instala GitHub CLI manualmente: https://cli.github.com/"
            exit 1
        fi
    fi
    
    # Verificar autenticación
    if ! gh auth status &> /dev/null; then
        show_warning "GitHub CLI no está autenticado"
        show_info "Ejecutando: gh auth login"
        gh auth login
    fi
    
    # Crear repositorio
    gh repo create $github_user/$REPO_NAME \
        --description "$REPO_DESCRIPTION" \
        --public \
        --source=. \
        --remote=origin \
        --push
    
    show_success "Repositorio creado en GitHub: https://github.com/$github_user/$REPO_NAME"
}

# Mostrar información del repositorio
show_repo_info() {
    local github_user="${1:-}"
    
    if [ -z "$github_user" ]; then
        show_error "Debes proporcionar tu usuario de GitHub"
        echo "Uso: ./setup-github.sh info [TU_USUARIO_GITHUB]"
        exit 1
    fi
    
    show_info "Información del repositorio GitHub:"
    echo ""
    echo "📁 Repositorio: $REPO_NAME"
    echo "👤 Usuario: $github_user"
    echo "🌐 URL: https://github.com/$github_user/$REPO_NAME"
    echo "📋 Descripción: $REPO_DESCRIPTION"
    echo ""
    
    # Verificar si el repositorio existe
    if curl -s "https://api.github.com/repos/$github_user/$REPO_NAME" | grep -q "Not Found"; then
        show_warning "El repositorio no existe en GitHub"
        show_info "Ejecuta: ./setup-github.sh create-repo $github_user"
    else
        show_success "Repositorio encontrado en GitHub"
    fi
}

# Comandos Git útiles
show_git_commands() {
    echo ""
    show_info "Comandos Git útiles para GitHub:"
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
    echo "  https://github.com/[TU_USUARIO]/spainbingo"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./setup-github.sh [OPCIÓN] [PARÁMETRO]"
    echo ""
    echo "Opciones:"
    echo "  ssh [USUARIO]      - Configurar SSH key para GitHub"
    echo "  create-repo [USUARIO] - Crear repositorio en GitHub"
    echo "  setup-repo [USUARIO]  - Configurar repositorio local"
    echo "  setup-ec2 [USUARIO]   - Configurar GitHub en la EC2"
    echo "  info [USUARIO]     - Mostrar información del repositorio"
    echo "  commands           - Mostrar comandos Git útiles"
    echo "  full-setup [USUARIO] - Configuración completa"
    echo "  help               - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./setup-github.sh ssh tuusuario"
    echo "  ./setup-github.sh create-repo tuusuario"
    echo "  ./setup-github.sh full-setup tuusuario"
    echo ""
    echo "Flujo recomendado:"
    echo "1. ./setup-github.sh ssh tuusuario"
    echo "2. Agregar clave SSH a GitHub"
    echo "3. ./setup-github.sh create-repo tuusuario"
    echo "4. ./setup-github.sh full-setup tuusuario"
    echo "5. git add . && git commit -m 'Cambios' && git push"
    echo "6. ./deploy-update.sh git-pull"
}

# Función principal
main() {
    case "${1:-help}" in
        "ssh")
            setup_ssh_key
            ;;
        "create-repo")
            create_github_repo "$2"
            ;;
        "setup-repo")
            setup_local_repo "$2"
            ;;
        "setup-ec2")
            setup_ec2_github "$2"
            ;;
        "info")
            show_repo_info "$2"
            ;;
        "commands")
            show_git_commands
            ;;
        "full-setup")
            if [ -z "$2" ]; then
                show_error "Debes proporcionar tu usuario de GitHub"
                echo "Uso: ./setup-github.sh full-setup [TU_USUARIO_GITHUB]"
                exit 1
            fi
            check_git
            setup_git_config
            setup_ssh_key
            create_github_repo "$2"
            setup_local_repo "$2"
            setup_ec2_github "$2"
            show_repo_info "$2"
            show_git_commands
            show_success "Configuración completa de GitHub finalizada"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@" 