#!/bin/bash

# Script simple para configurar HTTPS en el ALB
set -e

echo "🔒 Configurando HTTPS para spain-bingo.es..."

# Variables
ALB_ARN="arn:aws:elasticloadbalancing:eu-west-1:426448793571:loadbalancer/app/spainbingo-alb/9e0c2b7458d34fdc"
CERT_ARN="arn:aws:acm:eu-west-1:426448793571:certificate/e205aca5-0511-463c-a94f-649752ef4791"

echo "📋 Verificando listeners existentes..."

# Verificar listeners existentes
LISTENERS=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN 2>/dev/null || echo "error")

if [ "$LISTENERS" = "error" ]; then
    echo "❌ Error al conectar con AWS. Verifica tu configuración."
    exit 1
fi

echo "✅ Conectado a AWS correctamente"

# Obtener target group ARN
echo "📋 Obteniendo target group..."
TARGET_GROUP_ARN=$(aws elbv2 describe-target-groups --names spainbingo-ec2-tg --query 'TargetGroups[0].TargetGroupArn' --output text 2>/dev/null)

if [ -z "$TARGET_GROUP_ARN" ]; then
    echo "❌ No se pudo encontrar el target group 'spainbingo-ec2-tg'"
    exit 1
fi

echo "✅ Target group encontrado: $TARGET_GROUP_ARN"

# Verificar si ya existe listener HTTPS
echo "📋 Verificando listener HTTPS..."
HTTPS_LISTENER=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[?Port==`443`]' --output text 2>/dev/null)

if [ -n "$HTTPS_LISTENER" ]; then
    echo "⚠️  Listener HTTPS ya existe en el puerto 443"
else
    echo "📋 Creando listener HTTPS..."
    
    # Crear listener HTTPS
    HTTPS_LISTENER_ARN=$(aws elbv2 create-listener \
        --load-balancer-arn $ALB_ARN \
        --protocol HTTPS \
        --port 443 \
        --certificates CertificateArn=$CERT_ARN \
        --default-actions Type=forward,TargetGroupArn=$TARGET_GROUP_ARN \
        --query 'Listeners[0].ListenerArn' \
        --output text 2>/dev/null)
    
    if [ -n "$HTTPS_LISTENER_ARN" ]; then
        echo "✅ Listener HTTPS creado exitosamente: $HTTPS_LISTENER_ARN"
    else
        echo "❌ Error al crear listener HTTPS"
        exit 1
    fi
fi

# Obtener listener HTTP
echo "📋 Configurando redirección HTTP a HTTPS..."
HTTP_LISTENER_ARN=$(aws elbv2 describe-listeners --load-balancer-arn $ALB_ARN --query 'Listeners[?Port==`80`].ListenerArn' --output text 2>/dev/null)

if [ -n "$HTTP_LISTENER_ARN" ]; then
    # Configurar redirección HTTP a HTTPS
    aws elbv2 modify-listener \
        --listener-arn $HTTP_LISTENER_ARN \
        --default-actions Type=redirect,RedirectConfig='{Protocol=HTTPS,Port=443,StatusCode=HTTP_301}' \
        2>/dev/null
    
    echo "✅ Redirección HTTP a HTTPS configurada"
else
    echo "⚠️  No se encontró listener HTTP en el puerto 80"
fi

echo ""
echo "🎉 Configuración HTTPS completada"
echo ""
echo "📋 URLs de la aplicación:"
echo "   🔒 HTTPS: https://spain-bingo.es"
echo "   🔒 HTTPS www: https://www.spain-bingo.es"
echo "   🔗 ALB: http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com"
echo ""
echo "⚠️  IMPORTANTE: Asegúrate de que:"
echo "   1. El certificado SSL esté validado"
echo "   2. Los registros DNS apunten al ALB"
echo "   3. El dominio spain-bingo.es esté configurado"
echo ""
echo "🔍 Para verificar:"
echo "   curl -I https://spain-bingo.es" 