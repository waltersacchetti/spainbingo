#!/bin/bash

# Script de Despliegue EC2 para SpainBingo
# Autor: SpainBingo Team
# Fecha: 3 de Agosto de 2024

set -e  # Salir en caso de error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
PROJECT_NAME="spainbingo"
INSTANCE_TYPE="t3.medium"
REGION="eu-west-1"
KEY_NAME="spainbingo-key"
SECURITY_GROUP_NAME="spainbingo-sg"
AMI_ID="ami-0253a7ea84bc17a73"  # Ubuntu 22.04 LTS en eu-west-1

echo -e "${BLUE}🚀 Desplegando SpainBingo en EC2${NC}"

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

# Verificar dependencias
check_dependencies() {
    echo "🔍 Verificando dependencias..."
    
    if ! command -v aws &> /dev/null; then
        show_error "AWS CLI no está instalado."
    fi
    
    if ! command -v jq &> /dev/null; then
        show_error "jq no está instalado. Es necesario para procesar JSON."
    fi
    
    show_progress "Dependencias verificadas"
}

# Verificar configuración de AWS
check_aws_config() {
    echo "🔍 Verificando configuración de AWS..."
    
    if ! aws sts get-caller-identity &> /dev/null; then
        show_error "No se puede autenticar con AWS. Verifica tus credenciales."
    fi
    
    show_progress "Configuración de AWS verificada"
}

# Verificar y crear rol SSM si es necesario
check_ssm_role() {
    echo "🔍 Verificando rol SSM..."
    
    # Verificar si el rol existe
    if aws iam get-role --role-name AmazonSSMRoleForInstancesQuickSetup &> /dev/null; then
        show_progress "Rol SSM existente encontrado: AmazonSSMRoleForInstancesQuickSetup"
    else
        echo "📦 Creando rol SSM..."
        
        # Crear el rol
        aws iam create-role \
            --role-name AmazonSSMRoleForInstancesQuickSetup \
            --assume-role-policy-document '{
                "Version": "2012-10-17",
                "Statement": [
                    {
                        "Effect": "Allow",
                        "Principal": {
                            "Service": "ec2.amazonaws.com"
                        },
                        "Action": "sts:AssumeRole"
                    }
                ]
            }'
        
        # Adjuntar políticas SSM
        aws iam attach-role-policy \
            --role-name AmazonSSMRoleForInstancesQuickSetup \
            --policy-arn arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore
        
        aws iam attach-role-policy \
            --role-name AmazonSSMRoleForInstancesQuickSetup \
            --policy-arn arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy
        
        # Crear instance profile
        aws iam create-instance-profile \
            --instance-profile-name AmazonSSMRoleForInstancesQuickSetup
        
        # Agregar rol al instance profile
        aws iam add-role-to-instance-profile \
            --instance-profile-name AmazonSSMRoleForInstancesQuickSetup \
            --role-name AmazonSSMRoleForInstancesQuickSetup
        
        show_progress "Rol SSM creado: AmazonSSMRoleForInstancesQuickSetup"
    fi
}

# Crear par de claves SSH
create_key_pair() {
    echo "🔑 Creando par de claves SSH..."
    
    if aws ec2 describe-key-pairs --key-names $KEY_NAME &> /dev/null; then
        show_warning "El par de claves '$KEY_NAME' ya existe"
    else
        aws ec2 create-key-pair \
            --key-name $KEY_NAME \
            --query 'KeyMaterial' \
            --output text > $KEY_NAME.pem
        
        chmod 400 $KEY_NAME.pem
        show_progress "Par de claves creado: $KEY_NAME.pem"
    fi
}

# Crear grupo de seguridad
create_security_group() {
    echo "🛡️ Creando grupo de seguridad..."
    
    if aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME &> /dev/null; then
        show_warning "El grupo de seguridad '$SECURITY_GROUP_NAME' ya existe"
        SG_ID=$(aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --query 'SecurityGroups[0].GroupId' --output text)
    else
        SG_ID=$(aws ec2 create-security-group \
            --group-name $SECURITY_GROUP_NAME \
            --description "Security group for SpainBingo" \
            --query 'GroupId' --output text)
        
        # Reglas de entrada
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 22 \
            --cidr 0.0.0.0/0
        
        aws ec2 authorize-security-group-ingress \
            --group-id $SG_ID \
            --protocol tcp \
            --port 3000 \
            --cidr 0.0.0.0/0
        
        show_progress "Grupo de seguridad creado: $SG_ID"
    fi
}

# Crear script de inicialización
create_user_data() {
    echo "📝 Creando script de inicialización para Amazon Linux (sin Nginx)..."
    
    cat > user-data.sh << 'EOF'
#!/bin/bash

# Actualizar sistema
yum update -y

# Instalar dependencias
yum install -y git curl wget unzip

# Instalar Node.js 18.x usando NodeSource
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Verificar que Node.js se instaló correctamente
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js no se instaló correctamente"
    exit 1
fi

# Instalar PM2 globalmente
npm install -g pm2

# Verificar que PM2 se instaló correctamente
if ! command -v pm2 &> /dev/null; then
    echo "❌ Error: PM2 no se instaló correctamente"
    exit 1
fi

# Instalar y configurar SSM Agent (ya viene preinstalado en Amazon Linux 2)
systemctl enable amazon-ssm-agent
systemctl start amazon-ssm-agent

# Instalar CloudWatch Agent
yum install -y amazon-cloudwatch-agent

# Crear directorio de la aplicación
mkdir -p /var/www/spainbingo
cd /var/www/spainbingo

# Configurar permisos
chown -R ec2-user:ec2-user /var/www/spainbingo

# Crear archivo de configuración de PM2 para ec2-user
cat > /home/ec2-user/ecosystem.config.js << 'ECOSYSTEM_EOF'
module.exports = {
  apps: [{
    name: 'spainbingo',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      JWT_SECRET: 'spainbingo-prod-secret-2024'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s',
    restart_delay: 4000
  }]
};
ECOSYSTEM_EOF

# Crear directorio de logs
mkdir -p /var/www/spainbingo/logs
chown -R ec2-user:ec2-user /var/www/spainbingo/logs

# Configurar PM2 para iniciar automáticamente
sudo -u ec2-user pm2 startup systemd -u ec2-user --hp /home/ec2-user

# Crear script de inicio automático
cat > /etc/systemd/system/spainbingo.service << 'SERVICE_EOF'
[Unit]
Description=SpainBingo Application
After=network.target

[Service]
Type=forking
User=ec2-user
WorkingDirectory=/var/www/spainbingo
ExecStart=/usr/bin/pm2 start ecosystem.config.js
ExecReload=/usr/bin/pm2 reload spainbingo
ExecStop=/usr/bin/pm2 stop spainbingo
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE_EOF

# Habilitar servicio
systemctl enable spainbingo.service

# Configurar CloudWatch Agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << 'CW_EOF'
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/www/spainbingo/logs/combined.log",
                        "log_group_name": "/aws/ec2/spainbingo/application",
                        "log_stream_name": "{instance_id}",
                        "timezone": "UTC"
                    }
                ]
            }
        }
    },
    "metrics": {
        "metrics_collected": {
            "disk": {
                "measurement": ["used_percent"],
                "metrics_collection_interval": 60,
                "resources": ["*"]
            },
            "mem": {
                "measurement": ["mem_used_percent"],
                "metrics_collection_interval": 60
            }
        }
    }
}
CW_EOF

# Iniciar CloudWatch Agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json
systemctl enable amazon-cloudwatch-agent
systemctl start amazon-cloudwatch-agent

echo "🚀 SpainBingo instalado y configurado en Amazon Linux!"
echo "📁 Directorio de la aplicación: /var/www/spainbingo"
echo "👤 Usuario: ec2-user"
echo "🔧 PM2 configurado para iniciar automáticamente"
echo "📊 SSM Agent habilitado para gestión remota"
echo "📈 CloudWatch Agent configurado para monitoreo"
echo "🌐 Servidor Node.js ejecutándose en puerto 3000"
echo "⚖️  Configurar ALB para gestionar el tráfico"
EOF

    show_progress "Script de inicialización para Amazon Linux (sin Nginx) creado"
}

# Lanzar instancia EC2
launch_instance() {
    echo "🚀 Lanzando instancia EC2..."
    
    # Obtener ID del grupo de seguridad
    SG_ID=$(aws ec2 describe-security-groups --group-names $SECURITY_GROUP_NAME --query 'SecurityGroups[0].GroupId' --output text)
    
    # Lanzar instancia con instance profile
    INSTANCE_ID=$(aws ec2 run-instances \
        --image-id $AMI_ID \
        --count 1 \
        --instance-type $INSTANCE_TYPE \
        --key-name $KEY_NAME \
        --security-group-ids $SG_ID \
        --iam-instance-profile Name=AmazonSSMRoleForInstancesQuickSetup \
        --user-data file://user-data.sh \
        --tag-specifications "ResourceType=instance,Tags=[{Key=Name,Value=SpainBingo-Server},{Key=Project,Value=SpainBingo}]" \
        --query 'Instances[0].InstanceId' --output text)
    
    show_progress "Instancia lanzada: $INSTANCE_ID"
    
    # Esperar a que esté ejecutándose
    echo "⏳ Esperando a que la instancia esté ejecutándose..."
    aws ec2 wait instance-running --instance-ids $INSTANCE_ID
    
    # Obtener IP pública
    PUBLIC_IP=$(aws ec2 describe-instances \
        --instance-ids $INSTANCE_ID \
        --query 'Reservations[0].Instances[0].PublicIpAddress' --output text)
    
    show_progress "IP pública: $PUBLIC_IP"
    
    # Guardar información
    echo "INSTANCE_ID=$INSTANCE_ID" > ec2-info.txt
    echo "PUBLIC_IP=$PUBLIC_IP" >> ec2-info.txt
    echo "KEY_FILE=$KEY_NAME.pem" >> ec2-info.txt
    echo "INSTANCE_PROFILE=AmazonSSMRoleForInstancesQuickSetup" >> ec2-info.txt
    
    show_progress "Información guardada en ec2-info.txt"
}

# Crear script de despliegue
create_deploy_script() {
    echo "📦 Creando script de despliegue para Amazon Linux..."
    
    cat > deploy-to-server.sh << 'EOF'
#!/bin/bash

# Script para desplegar archivos al servidor EC2 (Amazon Linux)
# Uso: ./deploy-to-server.sh

set -e

# Cargar información del servidor
if [ -f ec2-info.txt ]; then
    source ec2-info.txt
else
    echo "❌ No se encontró ec2-info.txt"
    exit 1
fi

echo "🚀 Desplegando SpainBingo al servidor Amazon Linux..."

# Crear archivo de configuración del servidor
cat > server.js << 'SERVER_EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'entrada.html'));
});

app.get('/welcome', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoints para autenticación (simulada)
app.post('/api/login', (req, res) => {
    // Simular autenticación
    res.json({ success: true, user: req.body.username });
});

app.post('/api/register', (req, res) => {
    // Simular registro
    res.json({ success: true, user: req.body.username });
});

// API para el juego
app.get('/api/game/numbers', (req, res) => {
    // Generar números aleatorios para el bingo
    const numbers = [];
    while (numbers.length < 90) {
        const num = Math.floor(Math.random() * 90) + 1;
        if (!numbers.includes(num)) {
            numbers.push(num);
        }
    }
    res.json({ numbers });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal!' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 SpainBingo servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
});

module.exports = app;
SERVER_EOF

# Crear package.json
cat > package.json << 'PACKAGE_EOF'
{
  "name": "spainbingo-server",
  "version": "1.0.0",
  "description": "SpainBingo - Servidor de Bingo Online",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:restart": "pm2 restart spainbingo",
    "pm2:stop": "pm2 stop spainbingo"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
PACKAGE_EOF

# Crear directorio public y copiar archivos
mkdir -p public

# Copiar archivos HTML
cp *.html public/ 2>/dev/null || true
cp *.css public/ 2>/dev/null || true
cp *.js public/ 2>/dev/null || true

# Crear archivo de configuración de PM2
cat > ecosystem.config.js << 'ECOSYSTEM_EOF'
module.exports = {
  apps: [{
    name: 'spainbingo',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
ECOSYSTEM_EOF

echo "📦 Archivos del servidor creados"
echo "🚀 Para desplegar al servidor Amazon Linux:"
echo "   scp -i $KEY_FILE -r . ec2-user@$PUBLIC_IP:/var/www/spainbingo/"
echo "   ssh -i $KEY_FILE ec2-user@$PUBLIC_IP 'cd /var/www/spainbingo && npm install && pm2 restart spainbingo'"
echo ""
echo "🔧 Comandos útiles para Amazon Linux:"
echo "   ssh -i $KEY_FILE ec2-user@$PUBLIC_IP"
echo "   sudo systemctl status spainbingo"
echo "   sudo systemctl restart spainbingo"
echo "   pm2 logs spainbingo"
EOF

    chmod +x deploy-to-server.sh
    show_progress "Script de despliegue para Amazon Linux creado: deploy-to-server.sh"
}

# Configurar CloudFront para EC2
setup_cloudfront() {
    echo "☁️ Configurando CloudFront para EC2..."
    
    # Crear configuración de CloudFront para EC2
    cat > cloudfront-ec2-config.json << 'EOF'
{
    "CallerReference": "spainbingo-ec2-distribution",
    "Comment": "SpainBingo EC2 Distribution",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "EC2-spainbingo",
                "DomainName": "EC2_IP_PLACEHOLDER",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "EC2-spainbingo",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": true,
            "Cookies": {
                "Forward": "all"
            }
        },
        "MinTTL": 0,
        "Compress": true
    },
    "Enabled": true,
    "PriceClass": "PriceClass_100"
}
EOF

    show_progress "Configuración de CloudFront creada"
}

# Función principal
main() {
    echo -e "${BLUE}🚀 Desplegando SpainBingo en EC2 (Amazon Linux)${NC}"
    echo "=================================================="
    
    check_dependencies
    check_aws_config
    check_ssm_role
    create_key_pair
    create_security_group
    create_user_data
    launch_instance
    create_deploy_script
    setup_cloudfront
    
    echo "=================================================="
    echo -e "${GREEN}🎉 Instancia EC2 con Amazon Linux creada exitosamente${NC}"
    echo ""
    echo -e "${YELLOW}📋 Próximos pasos:${NC}"
    echo "1. Esperar 5-10 minutos para que la instancia se configure"
    echo "2. Ejecutar: ./deploy-to-server.sh"
    echo "3. Conectar: ssh -i $KEY_NAME.pem ec2-user@$PUBLIC_IP"
    echo ""
    echo -e "${BLUE}🌐 URLs:${NC}"
    echo "   HTTP: http://$PUBLIC_IP"
    echo "   SSH: ssh -i $KEY_NAME.pem ec2-user@$PUBLIC_IP"
    echo ""
    echo -e "${YELLOW}🔧 Características de Amazon Linux:${NC}"
    echo "   - Usuario: ec2-user"
    echo "   - Gestor de paquetes: yum"
    echo "   - Servicio systemd: spainbingo.service"
    echo "   - Directorio: /var/www/spainbingo"
    echo "   - Logs: /var/www/spainbingo/logs/"
    echo ""
    echo -e "${YELLOW}📊 Servicios AWS Configurados:${NC}"
    echo "   - SSM Agent: Habilitado para gestión remota"
    echo "   - CloudWatch Agent: Monitoreo de logs y métricas"
    echo "   - Instance Profile: AmazonSSMRoleForInstancesQuickSetup"
    echo "   - IAM Role: Permisos para SSM y CloudWatch"
    echo ""
    echo -e "${YELLOW}🔗 Conexión SSM (opcional):${NC}"
    echo "   aws ssm start-session --target $INSTANCE_ID"
    echo "   aws ssm send-command --instance-ids $INSTANCE_ID --document-name AWS-RunShellScript --parameters commands='pm2 status'"
    echo ""
    echo -e "${YELLOW}⚠️  Notas:${NC}"
    echo "   - La instancia tarda 5-10 minutos en configurarse"
    echo "   - Usa el script deploy-to-server.sh para subir archivos"
    echo "   - Considera configurar un dominio y SSL"
    echo "   - Amazon Linux es optimizado para AWS"
    echo "   - SSM permite gestión remota sin SSH"
    
    # Limpiar archivos temporales
    rm -f user-data.sh
}

# Ejecutar función principal
main "$@" 