#!/bin/bash

# Script de Diagnóstico para SpainBingo EC2
# Autor: SpainBingo Team
# Fecha: 3 de Agosto de 2024

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🔍 Diagnóstico de Instancia EC2${NC}"

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
}

# Cargar información de la instancia
load_instance_info() {
    if [ -f ec2-info.txt ]; then
        source ec2-info.txt
        echo "📋 Información de la instancia cargada"
    else
        show_error "No se encontró ec2-info.txt. Ejecuta deploy-ec2.sh primero."
        exit 1
    fi
}

# Verificar estado de la instancia
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
        return 1
    fi
}

# Verificar servicios del sistema
check_system_services() {
    echo "🔧 Verificando servicios del sistema..."
    
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands='systemctl status spainbingo amazon-ssm-agent amazon-cloudwatch-agent' \
        --query 'Command.CommandId' \
        --output text)
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Verificar instalación de paquetes
check_packages() {
    echo "📦 Verificando instalación de paquetes..."
    
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands='which node && which pm2 && which aws' \
        --query 'Command.CommandId' \
        --output text)
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Verificar aplicación Node.js
check_nodejs_app() {
    echo "🌐 Verificando aplicación Node.js..."
    
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands='cd /var/www/spainbingo && ls -la && pm2 status' \
        --query 'Command.CommandId' \
        --output text)
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Verificar directorios de la aplicación
check_app_directories() {
    echo "📁 Verificando directorios de la aplicación..."
    
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands='ls -la /var/www/spainbingo/ && ls -la /home/ec2-user/' \
        --query 'Command.CommandId' \
        --output text)
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Verificar logs del sistema
check_system_logs() {
    echo "📋 Verificando logs del sistema..."
    
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands='journalctl -u nginx --lines 10 && journalctl -u spainbingo --lines 10' \
        --query 'Command.CommandId' \
        --output text)
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Verificar conectividad
check_connectivity() {
    echo "🌐 Verificando conectividad..."
    
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands='curl -I http://localhost:3000' \
        --query 'Command.CommandId' \
        --output text)
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Verificar métricas del sistema
check_system_metrics() {
    echo "📈 Verificando métricas del sistema..."
    
    COMMAND_ID=$(aws ssm send-command \
        --instance-ids $INSTANCE_ID \
        --document-name "AWS-RunShellScript" \
        --parameters commands='df -h && free -h && uptime' \
        --query 'Command.CommandId' \
        --output text)
    
    echo "⏳ Esperando resultado..."
    sleep 5
    
    aws ssm get-command-invocation \
        --command-id $COMMAND_ID \
        --instance-id $INSTANCE_ID \
        --query 'StandardOutputContent' \
        --output text
}

# Función principal
main() {
    load_instance_info
    
    if ! check_instance_status; then
        exit 1
    fi
    
    echo ""
    echo -e "${BLUE}🔍 Diagnóstico Completo de SpainBingo${NC}"
    echo "=========================================="
    
    echo ""
    echo "1. Verificando servicios del sistema..."
    check_system_services
    
    echo ""
    echo "2. Verificando instalación de paquetes..."
    check_packages
    
    echo ""
    echo "3. Verificando aplicación Node.js..."
    check_nodejs_app
    
    echo ""
    echo "4. Verificando directorios de la aplicación..."
    check_app_directories
    
    echo ""
    echo "5. Verificando logs del sistema..."
    check_system_logs
    
    echo ""
    echo "6. Verificando conectividad..."
    check_connectivity
    
    echo ""
    echo "7. Verificando métricas del sistema..."
    check_system_metrics
    
    echo ""
    echo "=========================================="
    echo -e "${GREEN}🎉 Diagnóstico completado${NC}"
    echo ""
    echo -e "${YELLOW}📋 Próximos pasos:${NC}"
    echo "1. Si hay errores, revisa los logs específicos"
    echo "2. Ejecuta: ./ssm-manage.sh para gestión remota"
    echo "3. Ejecuta: ./deploy-to-server.sh para desplegar la aplicación"
}

# Ejecutar función principal
main "$@" 