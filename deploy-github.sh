#!/bin/bash

# Script para desplegar desde GitHub a la EC2
# Uso: ./deploy-github.sh [OPCIÓN]

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
    
    if ! aws sts get-caller-identity &> /dev/null; then
        show_error "AWS CLI no está configurado. Ejecuta 'aws configure'"
        exit 1
    fi
    
    show_success "AWS CLI configurado correctamente"
}

# Desplegar desde GitHub
deploy_from_github() {
    load_instance_info
    check_aws_cli
    
    show_info "Desplegando desde GitHub..."
    
    # Comandos para desplegar en la EC2
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "cd /var/www/spainbingo",
            "echo \"=== Backup actual ===\"",
            "tar -czf backup-before-deploy-$(date +%Y%m%d-%H%M%S).tar.gz .",
            "echo \"=== Actualizando desde GitHub ===\"",
            "git status",
            "git fetch origin",
            "git reset --hard origin/main || git reset --hard origin/master",
            "echo \"=== Instalando dependencias ===\"",
            "npm install --production",
            "echo \"=== Reiniciando aplicación ===\"",
            "pm2 restart spainbingo",
            "pm2 save",
            "echo \"=== Verificando estado ===\"",
            "pm2 status",
            "curl -s http://localhost:3000/health || echo \"App no responde\"",
            "echo \"Despliegue desde GitHub completado\""
        ]' \
        --query 'Command.CommandId' \
        --output text > command_id.txt
    
    command_id=$(cat command_id.txt)
    show_info "Comando ejecutado: $command_id"
    
    # Esperar y mostrar resultado
    sleep 15
    aws ssm get-command-invocation \
        --command-id $command_id \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Desplegar rama específica
deploy_branch() {
    local branch="${1:-main}"
    load_instance_info
    check_aws_cli
    
    show_info "Desplegando rama: $branch"
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[
            \"cd /var/www/spainbingo\",
            \"echo '=== Backup actual ==='\",
            \"tar -czf backup-before-deploy-\$(date +%Y%m%d-%H%M%S).tar.gz .\",
            \"echo '=== Actualizando rama $branch ==='\",
            \"git fetch origin\",
            \"git checkout $branch || git checkout -b $branch origin/$branch\",
            \"git reset --hard origin/$branch\",
            \"echo '=== Instalando dependencias ==='\",
            \"npm install --production\",
            \"echo '=== Reiniciando aplicación ==='\",
            \"pm2 restart spainbingo\",
            \"pm2 save\",
            \"echo '=== Verificando estado ==='\",
            \"pm2 status\",
            \"curl -s http://localhost:3000/health || echo 'App no responde'\",
            \"echo 'Despliegue de rama $branch completado'\"
        ]" \
        --query 'Command.CommandId' \
        --output text > command_id.txt
    
    command_id=$(cat command_id.txt)
    show_info "Comando ejecutado: $command_id"
    
    # Esperar y mostrar resultado
    sleep 15
    aws ssm get-command-invocation \
        --command-id $command_id \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Desplegar commit específico
deploy_commit() {
    local commit_hash="${1:-}"
    
    if [ -z "$commit_hash" ]; then
        show_error "Debes proporcionar el hash del commit"
        echo "Uso: ./deploy-github.sh commit [HASH]"
        exit 1
    fi
    
    load_instance_info
    check_aws_cli
    
    show_info "Desplegando commit: $commit_hash"
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=[
            \"cd /var/www/spainbingo\",
            \"echo '=== Backup actual ==='\",
            \"tar -czf backup-before-deploy-\$(date +%Y%m%d-%H%M%S).tar.gz .\",
            \"echo '=== Actualizando a commit $commit_hash ==='\",
            \"git fetch origin\",
            \"git reset --hard $commit_hash\",
            \"echo '=== Instalando dependencias ==='\",
            \"npm install --production\",
            \"echo '=== Reiniciando aplicación ==='\",
            \"pm2 restart spainbingo\",
            \"pm2 save\",
            \"echo '=== Verificando estado ==='\",
            \"pm2 status\",
            \"curl -s http://localhost:3000/health || echo 'App no responde'\",
            \"echo 'Despliegue del commit $commit_hash completado'\"
        ]" \
        --query 'Command.CommandId' \
        --output text > command_id.txt
    
    command_id=$(cat command_id.txt)
    show_info "Comando ejecutado: $command_id"
    
    # Esperar y mostrar resultado
    sleep 15
    aws ssm get-command-invocation \
        --command-id $command_id \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Verificar estado de la aplicación
check_app_status() {
    load_instance_info
    
    show_info "Verificando estado de la aplicación..."
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "cd /var/www/spainbingo",
            "echo \"=== Estado de Git ===\"",
            "git status",
            "git log --oneline -5",
            "echo \"=== Estado de PM2 ===\"",
            "pm2 status",
            "echo \"=== Estado de la aplicación ===\"",
            "curl -s http://localhost:3000/health || echo \"App no responde\"",
            "echo \"=== Estado del sistema ===\"",
            "systemctl status spainbingo --no-pager"
        ]' \
        --query 'Command.CommandId' \
        --output text > command_id.txt
    
    command_id=$(cat command_id.txt)
    show_info "Comando ejecutado: $command_id"
    
    # Esperar y mostrar resultado
    sleep 5
    aws ssm get-command-invocation \
        --command-id $command_id \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Rollback a versión anterior
rollback() {
    load_instance_info
    
    show_info "Realizando rollback..."
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "cd /var/www/spainbingo",
            "echo \"=== Listando backups disponibles ===\"",
            "ls -la backup-before-deploy-*.tar.gz | tail -5",
            "echo \"=== Restaurando último backup ===\"",
            "LATEST_BACKUP=$(ls -t backup-before-deploy-*.tar.gz | head -1)",
            "if [ -n \"$LATEST_BACKUP\" ]; then",
            "  tar -xzf $LATEST_BACKUP",
            "  npm install --production",
            "  pm2 restart spainbingo",
            "  pm2 save",
            "  echo \"Rollback completado usando $LATEST_BACKUP\"",
            "else",
            "  echo \"No se encontraron backups para rollback\"",
            "fi"
        ]' \
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

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./deploy-github.sh [OPCIÓN] [PARÁMETRO]"
    echo ""
    echo "Opciones:"
    echo "  deploy          - Desplegar desde GitHub (rama principal)"
    echo "  branch [RAMA]   - Desplegar rama específica"
    echo "  commit [HASH]   - Desplegar commit específico"
    echo "  status          - Verificar estado de la aplicación"
    echo "  rollback        - Revertir a versión anterior"
    echo "  help            - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./deploy-github.sh deploy"
    echo "  ./deploy-github.sh branch develop"
    echo "  ./deploy-github.sh commit abc123"
    echo "  ./deploy-github.sh status"
    echo "  ./deploy-github.sh rollback"
    echo ""
    echo "Flujo recomendado:"
    echo "1. git add . && git commit -m 'Cambios' && git push"
    echo "2. ./deploy-github.sh deploy"
    echo "3. ./deploy-github.sh status"
}

# Función principal
main() {
    case "${1:-help}" in
        "deploy")
            deploy_from_github
            ;;
        "branch")
            deploy_branch "$2"
            ;;
        "commit")
            deploy_commit "$2"
            ;;
        "status")
            check_app_status
            ;;
        "rollback")
            rollback
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@" 