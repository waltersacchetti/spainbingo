#!/bin/bash

# Script de despliegue completo para SpainBingo
# Maneja todo el flujo CI/CD con la carpeta public
# Uso: ./deploy-complete.sh [OPCIÓN]

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

# Sincronizar archivos con public
sync_public() {
    show_info "Sincronizando archivos con carpeta public..."
    
    if [ -f "sync-public.sh" ]; then
        ./sync-public.sh sync
    else
        show_warning "Script sync-public.sh no encontrado, sincronizando manualmente..."
        
        # Sincronización manual
        mkdir -p public
        cp index.html public/ 2>/dev/null || true
        cp styles.css public/ 2>/dev/null || true
        cp script.js public/ 2>/dev/null || true
        cp auth.js public/ 2>/dev/null || true
        cp security.js public/ 2>/dev/null || true
        cp welcome.html public/ 2>/dev/null || true
        cp welcome-styles.css public/ 2>/dev/null || true
        cp welcome-script.js public/ 2>/dev/null || true
        cp login.html public/ 2>/dev/null || true
        cp entrada.html public/ 2>/dev/null || true
        cp privacy-policy.html public/ 2>/dev/null || true
        cp terms.html public/ 2>/dev/null || true
        
        show_success "Sincronización manual completada"
    fi
}

# Commit y push a Git
commit_and_push() {
    local commit_message="${1:-Actualización automática de SpainBingo}"
    
    show_info "Realizando commit y push..."
    
    # Verificar si hay cambios
    if git diff --quiet && git diff --cached --quiet; then
        show_warning "No hay cambios para commitear"
        return 0
    fi
    
    # Agregar todos los cambios
    git add .
    
    # Commit
    git commit -m "$commit_message"
    
    # Push
    git push origin master
    
    show_success "Commit y push completados"
}

# Desplegar a la EC2
deploy_to_ec2() {
    show_info "Desplegando a la EC2..."
    
    # Copiar archivos a la EC2
    show_info "Copiando archivos a la EC2..."
    scp -i spainbingo-key.pem -r public/ ec2-user@$PUBLIC_IP:/var/www/spainbingo/
    
    # Reiniciar aplicación desde la carpeta public
    show_info "Reiniciando aplicación..."
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /var/www/spainbingo/public && pm2 restart spainbingo'
    
    show_success "Despliegue a EC2 completado"
}

# Verificar estado de la aplicación
verify_deployment() {
    show_info "Verificando estado de la aplicación..."
    
    # Verificar health check
    local health_check=$(ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'curl -s http://localhost:3000/api/health')
    
    if echo "$health_check" | grep -q "success"; then
        show_success "Aplicación funcionando correctamente"
    else
        show_error "La aplicación no responde correctamente"
        return 1
    fi
    
    # Verificar que los archivos se actualizaron
    show_info "Verificando archivos actualizados..."
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /var/www/spainbingo/public && ls -la | head -10'
}

# Despliegue completo
full_deploy() {
    local commit_message="${1:-Actualización automática de SpainBingo}"
    
    show_info "🚀 Iniciando despliegue completo..."
    
    # 1. Sincronizar archivos
    sync_public
    
    # 2. Commit y push
    commit_and_push "$commit_message"
    
    # 3. Desplegar a EC2
    deploy_to_ec2
    
    # 4. Verificar
    verify_deployment
    
    show_success "🎉 Despliegue completo finalizado exitosamente"
}

# Despliegue rápido (solo EC2)
quick_deploy() {
    show_info "⚡ Iniciando despliegue rápido..."
    
    # 1. Sincronizar archivos
    sync_public
    
    # 2. Desplegar a EC2
    deploy_to_ec2
    
    # 3. Verificar
    verify_deployment
    
    show_success "⚡ Despliegue rápido completado"
}

# Verificar estado
check_status() {
    show_info "📊 Verificando estado de la aplicación..."
    
    # Estado de Git
    echo ""
    show_info "Estado de Git:"
    git status --short
    
    # Estado de sincronización
    if [ -f "sync-public.sh" ]; then
        echo ""
        show_info "Estado de sincronización:"
        ./sync-public.sh status
    fi
    
    # Estado de la aplicación
    echo ""
    show_info "Estado de la aplicación:"
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /var/www/spainbingo && pm2 status'
}

# Mostrar URLs
show_urls() {
    show_info "🌐 URLs de la aplicación:"
    echo ""
    echo "ALB (HTTP): http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com"
    echo "EC2 Directo: http://$PUBLIC_IP:3000"
    echo ""
    show_info "Para verificar cambios, visita:"
    echo "http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com"
}

# Función para mostrar ayuda
show_help() {
    echo "Uso: ./deploy-complete.sh [OPCIÓN] [MENSAJE]"
    echo ""
    echo "Opciones:"
    echo "  full [MENSAJE]  - Despliegue completo (sync + commit + push + deploy)"
    echo "  quick           - Despliegue rápido (solo sync + deploy)"
    echo "  sync            - Solo sincronizar archivos con public"
    echo "  commit [MENSAJE] - Solo commit y push"
    echo "  deploy          - Solo desplegar a EC2"
    echo "  status          - Verificar estado de la aplicación"
    echo "  urls            - Mostrar URLs de la aplicación"
    echo "  help            - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./deploy-complete.sh full \"Agregar nueva funcionalidad\""
    echo "  ./deploy-complete.sh quick"
    echo "  ./deploy-complete.sh status"
    echo ""
    echo "Flujo recomendado:"
    echo "1. Hacer cambios en los archivos principales"
    echo "2. ./deploy-complete.sh full \"Descripción de los cambios\""
    echo "3. Verificar en el navegador"
}

# Función principal
main() {
    case "${1:-help}" in
        "full")
            load_instance_info
            check_aws_cli
            full_deploy "${2:-Actualización automática de SpainBingo}"
            show_urls
            ;;
        "quick")
            load_instance_info
            check_aws_cli
            quick_deploy
            show_urls
            ;;
        "sync")
            sync_public
            ;;
        "commit")
            commit_and_push "${2:-Actualización automática de SpainBingo}"
            ;;
        "deploy")
            load_instance_info
            check_aws_cli
            deploy_to_ec2
            verify_deployment
            ;;
        "status")
            load_instance_info
            check_status
            ;;
        "urls")
            load_instance_info
            show_urls
            ;;
        "help"|*)
            show_help
            ;;
    esac
}

# Ejecutar función principal
main "$@" 