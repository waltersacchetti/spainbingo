#!/bin/bash

# Script para desplegar actualizaciones a la EC2
# Uso: ./deploy-update.sh [opción]

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

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./deploy-update.sh [OPCIÓN]"
    echo ""
    echo "Opciones:"
    echo "  git-pull     - Actualizar desde Git (recomendado)"
    echo "  upload       - Subir archivos locales a la EC2"
    echo "  restart      - Reiniciar solo la aplicación"
    echo "  full-deploy  - Despliegue completo (git-pull + restart)"
    echo "  status       - Ver estado de la aplicación"
    echo "  logs         - Ver logs de la aplicación"
    echo "  backup       - Crear backup antes de actualizar"
    echo "  rollback     - Revertir a la versión anterior"
    echo "  help         - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./deploy-update.sh git-pull"
    echo "  ./deploy-update.sh upload"
    echo "  ./deploy-update.sh full-deploy"
}

# Verificar estado de la aplicación
check_app_status() {
    show_info "Verificando estado de la aplicación..."
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "pm2 status",
            "systemctl status spainbingo --no-pager",
            "curl -s http://localhost:3000/health || echo \"App no responde\""
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

# Actualizar desde Git
update_from_git() {
    show_info "Actualizando desde Git..."
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "cd /var/www/spainbingo",
            "git status",
            "git pull origin main || git pull origin master",
            "npm install --production",
            "echo \"Actualización desde Git completada\""
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

# Subir archivos locales
upload_files() {
    show_info "Subiendo archivos locales a la EC2..."
    
    # Crear archivo temporal con los archivos
    tar -czf spainbingo-update.tar.gz \
        --exclude='node_modules' \
        --exclude='.git' \
        --exclude='*.log' \
        --exclude='ec2-info.txt' \
        --exclude='alb-info.txt' \
        --exclude='*.sh' \
        .
    
    show_info "Archivo comprimido creado: spainbingo-update.tar.gz"
    
    # Subir a S3 temporalmente
    aws s3 cp spainbingo-update.tar.gz s3://spainbingo-temp/ --quiet
    
    # Descargar en la EC2
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "cd /var/www/spainbingo",
            "aws s3 cp s3://spainbingo-temp/spainbingo-update.tar.gz .",
            "tar -xzf spainbingo-update.tar.gz --strip-components=0",
            "rm spainbingo-update.tar.gz",
            "npm install --production",
            "echo \"Archivos subidos correctamente\""
        ]' \
        --query 'Command.CommandId' \
        --output text > command_id.txt
    
    command_id=$(cat command_id.txt)
    show_info "Comando ejecutado: $command_id"
    
    # Limpiar archivo temporal
    rm spainbingo-update.tar.gz
    aws s3 rm s3://spainbingo-temp/spainbingo-update.tar.gz --quiet
    
    # Esperar y mostrar resultado
    sleep 15
    aws ssm get-command-invocation \
        --command-id $command_id \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Reiniciar aplicación
restart_app() {
    show_info "Reiniciando aplicación..."
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "cd /var/www/spainbingo",
            "pm2 restart spainbingo",
            "pm2 save",
            "echo \"Aplicación reiniciada correctamente\""
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

# Crear backup
create_backup() {
    show_info "Creando backup de la aplicación..."
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "cd /var/www",
            "tar -czf spainbingo-backup-$(date +%Y%m%d-%H%M%S).tar.gz spainbingo/",
            "echo \"Backup creado correctamente\""
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

# Ver logs
show_logs() {
    show_info "Mostrando logs de la aplicación..."
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters 'commands=[
            "pm2 logs spainbingo --lines 50",
            "echo \"--- Logs del sistema ---\"",
            "journalctl -u spainbingo --no-pager -n 20"
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

# Función principal
main() {
    case "${1:-help}" in
        "git-pull")
            load_instance_info
            update_from_git
            ;;
        "upload")
            load_instance_info
            upload_files
            ;;
        "restart")
            load_instance_info
            restart_app
            ;;
        "full-deploy")
            load_instance_info
            create_backup
            update_from_git
            restart_app
            show_success "Despliegue completo finalizado"
            ;;
        "status")
            load_instance_info
            check_app_status
            ;;
        "logs")
            load_instance_info
            show_logs
            ;;
        "backup")
            load_instance_info
            create_backup
            ;;
        "rollback")
            show_warning "Función de rollback no implementada aún"
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@" 