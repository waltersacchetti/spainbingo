#!/bin/bash

# Script de Gestión SSM para SpainBingo
# Autor: SpainBingo Team
# Fecha: 3 de Agosto de 2024

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔧 Gestión SSM para SpainBingo${NC}"

# Función para mostrar progreso
show_progress() {
    echo -e "${GREEN}✅ $1${NC}"
}

# Función para mostrar advertencia
show_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# Función para mostrar error
show_error() {
    echo -e "${RED}❌ $1${NC}"
    exit 1
}

# Cargar información de la instancia
load_instance_info() {
    if [ -f ec2-info.txt ]; then
        source ec2-info.txt
    else
        show_error "No se encontró ec2-info.txt. Ejecuta deploy-ec2.sh primero."
    fi
}

# Verificar que la instancia esté ejecutándose
check_instance_status() {
    echo "🔍 Verificando estado de la instancia..."
    
    STATUS=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text 2>/dev/null || echo "unknown")
    
    if [ "$STATUS" = "running" ]; then
        show_progress "Instancia ejecutándose: $INSTANCE_ID"
        return 0
    else
        show_error "Instancia no está ejecutándose. Estado: $STATUS"
    fi
}

# Conectar via SSM Session
connect_ssm() {
    echo "🔗 Conectando via SSM Session..."
    aws ssm start-session --target $INSTANCE_ID
}

# Ejecutar comando remoto
run_command() {
    local command="$1"
    echo "🚀 Ejecutando comando remoto: $command"
    
    aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters "commands=['$command']" \
        --query 'Command.CommandId' \
        --output text
}

# Obtener estado de la aplicación
get_app_status() {
    echo "📊 Obteniendo estado de la aplicación..."
    
    COMMAND_ID=$(run_command "cd /var/www/spainbingo && pm2 status")
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Ver logs de la aplicación
get_app_logs() {
    echo "📋 Obteniendo logs de la aplicación..."
    
    COMMAND_ID=$(run_command "cd /var/www/spainbingo && pm2 logs spainbingo --lines 50")
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Reiniciar aplicación
restart_app() {
    echo "🔄 Reiniciando aplicación..."
    
    COMMAND_ID=$(run_command "cd /var/www/spainbingo && pm2 restart spainbingo")
    
    echo "⏳ Esperando reinicio..."
    sleep 10
    
    show_progress "Aplicación reiniciada"
}

# Verificar servicios del sistema
check_services() {
    echo "🔍 Verificando servicios del sistema..."
    
    COMMAND_ID=$(run_command "systemctl status nginx spainbingo amazon-ssm-agent amazon-cloudwatch-agent")
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Ver métricas del sistema
get_system_metrics() {
    echo "📈 Obteniendo métricas del sistema..."
    
    COMMAND_ID=$(run_command "htop --batch --iterations=1 && df -h && free -h")
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Actualizar aplicación
update_app() {
    echo "📦 Actualizando aplicación..."
    
    COMMAND_ID=$(run_command "cd /var/www/spainbingo && git pull origin main && npm install && pm2 restart spainbingo")
    
    echo "⏳ Esperando actualización..."
    sleep 15
    
    show_progress "Aplicación actualizada"
}

# Ver logs de CloudWatch
show_cloudwatch_logs() {
    echo "📊 Logs de CloudWatch disponibles:"
    echo "   - /aws/ec2/spainbingo/application"
    echo "   - /aws/ec2/spainbingo/nginx/access"
    echo "   - /aws/ec2/spainbingo/nginx/error"
    echo ""
    echo "Para ver logs en tiempo real:"
    echo "aws logs tail /aws/ec2/spainbingo/application --follow"
}

# Menú principal
show_menu() {
    echo ""
    echo -e "${BLUE}🔧 Gestión SSM para SpainBingo${NC}"
    echo "=================================="
    echo "1. Conectar via SSM Session"
    echo "2. Ver estado de la aplicación"
    echo "3. Ver logs de la aplicación"
    echo "4. Reiniciar aplicación"
    echo "5. Verificar servicios del sistema"
    echo "6. Ver métricas del sistema"
    echo "7. Actualizar aplicación"
    echo "8. Ver logs de CloudWatch"
    echo "9. Ejecutar comando personalizado"
    echo "0. Salir"
    echo "=================================="
    echo -n "Selecciona una opción: "
}

# Ejecutar comando personalizado
run_custom_command() {
    echo -n "Ingresa el comando a ejecutar: "
    read -r custom_command
    
    if [ -n "$custom_command" ]; then
        COMMAND_ID=$(run_command "$custom_command")
        
        echo "⏳ Esperando resultado..."
        sleep 5
        
        aws ssm get-command-invocation \
            --command-id $COMMAND_ID \
            --instance-id $INSTANCE_ID \
            --query 'StandardOutputContent' \
            --output text
    else
        show_warning "Comando vacío"
    fi
}

# Función principal
main() {
    load_instance_info
    check_instance_status
    
    while true; do
        show_menu
        read -r option
        
        case $option in
            1)
                connect_ssm
                ;;
            2)
                get_app_status
                ;;
            3)
                get_app_logs
                ;;
            4)
                restart_app
                ;;
            5)
                check_services
                ;;
            6)
                get_system_metrics
                ;;
            7)
                update_app
                ;;
            8)
                show_cloudwatch_logs
                ;;
            9)
                run_custom_command
                ;;
            0)
                echo "👋 ¡Hasta luego!"
                exit 0
                ;;
            *)
                show_warning "Opción inválida"
                ;;
        esac
        
        echo ""
        echo -n "Presiona Enter para continuar..."
        read -r
    done
}

# Ejecutar función principal
main "$@" 