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
        show_warning "Script sync-public.sh no encontrado, verificando carpeta public..."
        
        # Verificar que la carpeta public existe y tiene contenido
        if [ ! -d "public" ]; then
            show_error "Carpeta public no encontrada"
            return 1
        fi
        
        if [ ! -f "public/server.js" ]; then
            show_error "Archivo public/server.js no encontrado"
            return 1
        fi
        
        show_success "Carpeta public verificada correctamente"
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
    
    # Crear directorio public en el servidor si no existe
    show_info "Creando directorio public en el servidor..."
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'mkdir -p /home/ec2-user/public'
    
    # Copiar archivos a la EC2 (solo la carpeta public)
    show_info "Copiando archivos a la EC2..."
    rsync -avz --delete -e "ssh -i spainbingo-key.pem" public/ ec2-user@$PUBLIC_IP:/home/ec2-user/public/ --exclude='node_modules' --exclude='.git'
    
    # Instalar dependencias si es necesario
    show_info "Verificando dependencias..."
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /home/ec2-user && if [ ! -d "node_modules" ] || [ ! -f "node_modules/sequelize/package.json" ]; then npm install sequelize pg pg-hstore bcrypt uuid; fi'
    
    # Reiniciar aplicación
    show_info "Reiniciando aplicación..."
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /home/ec2-user && pm2 restart bingoroyal'
    
    show_success "Despliegue a EC2 completado"
}

# Verificar estado de la aplicación
verify_deployment() {
    show_info "Verificando estado de la aplicación..."
    
    # Verificar health check
    local health_check=$(ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'curl -s http://localhost:3000/api/admin/users/stats')
    
    if echo "$health_check" | grep -q "success"; then
        show_success "Aplicación funcionando correctamente"
    else
        show_warning "La aplicación no responde al health check, verificando estado PM2..."
        ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /home/ec2-user && pm2 status'
    fi
    
    # Verificar que los archivos se actualizaron
    show_info "Verificando archivos actualizados..."
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /home/ec2-user/public && ls -la | head -10'
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
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /home/ec2-user && pm2 status'
    
    # Estado de las APIs
    echo ""
    show_info "Estado de las APIs:"
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'curl -s http://localhost:3000/api/admin/users/stats | head -5'
    
    # Estado de archivos en el servidor
    echo ""
    show_info "Archivos en el servidor:"
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /home/ec2-user/public && ls -la | head -10'
}

# Probar sistema de gestión de usuarios
test_user_management() {
    show_info "🧪 Probando sistema de gestión de usuarios..."
    
    # Probar APIs
    echo ""
    show_info "Probando APIs de gestión de usuarios:"
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'curl -s http://localhost:3000/api/admin/users/stats'
    
    echo ""
    show_info "Probando APIs de caché:"
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'curl -s http://localhost:3000/api/admin/cache/stats'
    
    echo ""
    show_info "Probando script CLI de gestión:"
    ssh -i spainbingo-key.pem ec2-user@$PUBLIC_IP 'cd /home/ec2-user && node scripts/user-management.js cache-stats'
    
    show_success "Pruebas del sistema de gestión de usuarios completadas"
}

# Mostrar URLs
show_urls() {
    show_info "🌐 URLs de la aplicación:"
    echo ""
    echo "🌍 ALB Principal: http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com"
    echo "🌍 EC2 Directo: http://$PUBLIC_IP:3000"
    echo ""
    show_info "Para verificar cambios, visita:"
    echo "http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com"
    echo ""
    show_info "Nota: Los dominios spain-bingo.es están en configuración"
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
    echo "  test-users      - Probar sistema de gestión de usuarios"
    echo "  urls            - Mostrar URLs de la aplicación"
    echo "  help            - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./deploy-complete.sh full \"Agregar nueva funcionalidad\""
    echo "  ./deploy-complete.sh quick"
    echo "  ./deploy-complete.sh status"
    echo "  ./deploy-complete.sh test-users"
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
        "test-users")
            load_instance_info
            test_user_management
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