# 🚀 SpainBingo - Despliegue en EC2 (Amazon Linux)

## 📋 Descripción

SpainBingo es una aplicación de bingo online profesional que requiere un servidor completo para funcionar correctamente. Este proyecto incluye:

- **Servidor Node.js** con Express
- **Autenticación JWT** completa
- **WebSockets** para chat en tiempo real
- **API REST** para el juego
- **Base de datos** en memoria (simulada)
- **Seguridad** y validaciones
- **Gestión de sesiones**

## 🏗️ Arquitectura

### **Por qué EC2 con ALB en lugar de S3 estático?**

Para una aplicación de bingo online necesitas:

✅ **Servidor dinámico** - Autenticación, sesiones, lógica de juego  
✅ **Base de datos** - Usuarios, partidas, transacciones  
✅ **WebSockets** - Chat en tiempo real, actualizaciones  
✅ **API REST** - Compras, ganancias, depósitos  
✅ **Seguridad** - Validaciones, rate limiting, JWT  
✅ **Escalabilidad** - Múltiples usuarios simultáneos  
✅ **Load Balancer** - Distribución de carga y alta disponibilidad  

❌ **S3 estático** - Solo archivos estáticos, sin lógica de servidor

### **Arquitectura con ALB**

```
Internet → ALB → EC2 (Puerto 3000) → Node.js App
```

**Ventajas de ALB vs Nginx:**
- ✅ **Gestión AWS nativa** - Integración completa con AWS
- ✅ **SSL automático** - Certificados ACM incluidos
- ✅ **Health checks** - Monitoreo automático de salud
- ✅ **Escalabilidad** - Agregar instancias fácilmente
- ✅ **Seguridad** - WAF integrado
- ✅ **Logs centralizados** - CloudWatch Logs
- ✅ **Métricas** - CloudWatch Metrics
- ✅ **Auto Scaling** - Escalado automático

## 🚀 Despliegue Rápido

### **1. Crear instancia EC2**
```bash
./deploy-ec2.sh
```

### **2. Configurar Application Load Balancer**
```bash
./setup-alb.sh
```

### **3. Desplegar aplicación**
```bash
./deploy-to-server.sh
```

### **4. Conectar al servidor**
```bash
# Via SSH (tradicional)
ssh -i spainbingo-key.pem ec2-user@[IP_PUBLICA]

# Via SSM (recomendado)
./ssm-manage.sh
```

## 📁 Estructura del Proyecto

```
spainbingo/
├── server.js              # Servidor principal
├── package.json           # Dependencias Node.js
├── ecosystem.config.js    # Configuración PM2
├── deploy-ec2.sh         # Script de creación EC2
├── setup-alb.sh          # Script de configuración ALB
├── deploy-to-server.sh   # Script de despliegue
├── ssm-manage.sh         # Script de gestión SSM
├── diagnose-instance.sh  # Script de diagnóstico
├── public/               # Archivos estáticos
│   ├── entrada.html
│   ├── welcome.html
│   ├── login.html
│   ├── index.html
│   ├── styles.css
│   ├── script.js
│   └── ...
└── logs/                 # Logs del servidor
```

## 🔧 Configuración del Servidor

### **Tecnologías Instaladas**
- **Amazon Linux 2** (optimizado para AWS)
- **Node.js 18.x**
- **Nginx** (proxy reverso)
- **PM2** (gestión de procesos)
- **systemd** (servicios del sistema)

### **Puertos Abiertos**
- **22** - SSH
- **80** - HTTP
- **443** - HTTPS
- **3000** - Aplicación Node.js

### **Servicios Configurados**
- **Nginx** - Proxy reverso a puerto 3000
- **PM2** - Gestión automática del proceso
- **systemd** - Servicio spainbingo.service
- **SSL** - Preparado para Let's Encrypt

## 🌐 URLs de Acceso

### **Desarrollo Local**
```bash
npm install
npm start
# http://localhost:3000
```

### **Producción EC2**
```
http://[IP_PUBLICA]
https://spainbingo.es (con dominio configurado)
```

## 🔐 Autenticación y Seguridad

### **Características de Seguridad**
- ✅ **JWT Tokens** - Autenticación segura
- ✅ **bcrypt** - Contraseñas hasheadas
- ✅ **Rate Limiting** - Protección contra spam
- ✅ **Helmet** - Headers de seguridad
- ✅ **Validación** - Sanitización de inputs
- ✅ **CORS** - Configuración segura

### **Verificación de Edad**
- ✅ **18+ obligatorio** - Cumple normativa española
- ✅ **Validación** - Verificación en registro

## 🎮 API del Juego

### **Endpoints Principales**

#### **Autenticación**
```bash
POST /api/register    # Registro de usuario
POST /api/login       # Inicio de sesión
GET  /api/user/profile # Perfil de usuario
```

#### **Juego**
```bash
GET  /api/game/numbers    # Obtener números del bingo
POST /api/game/buy-cards  # Comprar cartones
POST /api/game/claim-win  # Reclamar ganancia
```

#### **Transacciones**
```bash
POST /api/user/deposit    # Realizar depósito
```

### **Ejemplo de Uso**
```javascript
// Login
const response = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
});

// Comprar cartones
const cards = await fetch('/api/game/buy-cards', {
    method: 'POST',
    headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ package: 'premium', quantity: 1 })
});
```

## 💬 Chat en Tiempo Real

### **WebSocket Events**
```javascript
// Conectar al chat
socket.emit('join-chat');

// Enviar mensaje
socket.emit('send-message', { 
    username: 'Usuario', 
    message: '¡Hola!' 
});

// Recibir mensajes
socket.on('chat-message', (message) => {
    console.log(message);
});
```

## 🔧 Gestión Remota con SSM

### **¿Qué es AWS Systems Manager (SSM)?**

AWS Systems Manager (SSM) es un servicio que te permite gestionar instancias EC2 de forma remota sin necesidad de SSH, proporcionando:

- ✅ **Conexión segura** - Sin necesidad de claves SSH
- ✅ **Gestión centralizada** - Desde la consola AWS
- ✅ **Automatización** - Scripts y comandos remotos
- ✅ **Auditoría** - Logs de todas las acciones
- ✅ **Compliance** - Cumplimiento de seguridad

### **Configuración Automática**

El script `deploy-ec2.sh` configura automáticamente:

- ✅ **Instance Profile** - `AmazonSSMRoleForInstancesQuickSetup`
- ✅ **IAM Role** - Permisos para SSM y CloudWatch
- ✅ **SSM Agent** - Habilitado y configurado
- ✅ **CloudWatch Agent** - Monitoreo automático

### **Script de Gestión SSM**

```bash
# Ejecutar script de gestión
./ssm-manage.sh
```

#### **Opciones Disponibles:**

1. **Conectar via SSM Session** - Terminal interactivo
2. **Ver estado de la aplicación** - PM2 status
3. **Ver logs de la aplicación** - Logs en tiempo real
4. **Reiniciar aplicación** - PM2 restart
5. **Verificar servicios del sistema** - systemctl status
6. **Ver métricas del sistema** - CPU, memoria, disco
7. **Actualizar aplicación** - Git pull + npm install
8. **Ver logs de CloudWatch** - Logs centralizados
9. **Ejecutar comando personalizado** - Comandos específicos

### **Comandos SSM Directos**

#### **Conexión Interactiva**
```bash
# Conectar via SSM Session
aws ssm start-session --target [INSTANCE_ID]

# Ejecutar comando específico
aws ssm send-command \
    --instance-ids [INSTANCE_ID] \
    --document-name "AWS-RunShellScript" \
    --parameters commands='pm2 status'
```

#### **Gestión de la Aplicación**
```bash
# Ver estado de PM2
aws ssm send-command \
    --instance-ids [INSTANCE_ID] \
    --document-name "AWS-RunShellScript" \
    --parameters commands='cd /var/www/spainbingo && pm2 status'

# Reiniciar aplicación
aws ssm send-command \
    --instance-ids [INSTANCE_ID] \
    --document-name "AWS-RunShellScript" \
    --parameters commands='cd /var/www/spainbingo && pm2 restart spainbingo'

# Ver logs
aws ssm send-command \
    --instance-ids [INSTANCE_ID] \
    --document-name "AWS-RunShellScript" \
    --parameters commands='cd /var/www/spainbingo && pm2 logs spainbingo --lines 50'
```

#### **Gestión del Sistema**
```bash
# Verificar servicios
aws ssm send-command \
    --instance-ids [INSTANCE_ID] \
    --document-name "AWS-RunShellScript" \
    --parameters commands='systemctl status nginx spainbingo amazon-ssm-agent'

# Ver métricas del sistema
aws ssm send-command \
    --instance-ids [INSTANCE_ID] \
    --document-name "AWS-RunShellScript" \
    --parameters commands='df -h && free -h && uptime'
```

### **Ventajas de SSM vs SSH**

| Característica | SSH | SSM |
|----------------|-----|-----|
| **Seguridad** | ❌ Claves SSH | ✅ IAM Roles |
| **Auditoría** | ❌ Limitada | ✅ Completa |
| **Gestión** | ❌ Manual | ✅ Centralizada |
| **Compliance** | ❌ Difícil | ✅ Automático |
| **Escalabilidad** | ❌ Limitada | ✅ Ilimitada |
| **Firewall** | ❌ Puertos abiertos | ✅ Sin puertos |

## ⚖️ Application Load Balancer (ALB)

### **¿Qué es AWS ALB?**

AWS Application Load Balancer (ALB) es un servicio de balanceo de carga de nivel 7 que distribuye el tráfico de aplicaciones entre múltiples instancias EC2, proporcionando:

- ✅ **Alta disponibilidad** - Distribución automática de carga
- ✅ **Health checks** - Monitoreo de salud de instancias
- ✅ **SSL/TLS** - Terminación SSL automática
- ✅ **Escalabilidad** - Agregar/quitar instancias dinámicamente
- ✅ **Seguridad** - WAF integrado
- ✅ **Logs** - Acceso y error logs centralizados

### **Configuración Automática**

El script `setup-alb.sh` configura automáticamente:

- ✅ **Target Group** - `spainbingo-tg` (puerto 3000)
- ✅ **Health Check** - `/health` endpoint
- ✅ **Listener HTTP** - Puerto 80
- ✅ **Listener HTTPS** - Puerto 443 (con certificado)
- ✅ **Reglas de redirección** - HTTP → HTTPS
- ✅ **Registro de instancia** - EC2 en Target Group
- ✅ **Security Group ALB** - `spainbingo-alb-sg` (puertos 80, 443)
- ✅ **Security Group EC2** - Permite tráfico del ALB (puerto 3000)

### **Script de Configuración ALB**

```bash
# Configurar ALB
./setup-alb.sh
```

#### **Componentes Creados:**

1. **Target Group** - Agrupa instancias EC2
2. **Application Load Balancer** - Distribuye tráfico
3. **Listeners** - HTTP (80) y HTTPS (443)
4. **Health Checks** - Verifica `/health` endpoint
5. **Security Groups** - Permite tráfico ALB → EC2

### **Comandos ALB Directos**

#### **Verificar estado del ALB**
```bash
# Ver información del ALB
aws elbv2 describe-load-balancers --names spainbingo-alb

# Ver Target Group
aws elbv2 describe-target-groups --names spainbingo-tg

# Ver health status
aws elbv2 describe-target-health --target-group-arn [TARGET_GROUP_ARN]
```

#### **Agregar más instancias**
```bash
# Registrar nueva instancia
aws elbv2 register-targets \
    --target-group-arn [TARGET_GROUP_ARN] \
    --targets Id=[NEW_INSTANCE_ID]
```

#### **Configurar Auto Scaling**
```bash
# Crear Auto Scaling Group
aws autoscaling create-auto-scaling-group \
    --auto-scaling-group-name spainbingo-asg \
    --target-group-arns [TARGET_GROUP_ARN] \
    --min-size 1 \
    --max-size 5 \
    --desired-capacity 2
```

### **🛡️ Security Groups**

#### **Security Group del ALB (`spainbingo-alb-sg`)**
- ✅ **Puerto 80** - HTTP desde Internet
- ✅ **Puerto 443** - HTTPS desde Internet
- ✅ **Descripción** - "Security group for SpainBingo ALB"

#### **Security Group de EC2 (`spainbingo-sg`)**
- ✅ **Puerto 22** - SSH desde Internet
- ✅ **Puerto 3000** - Solo desde ALB Security Group
- ✅ **Descripción** - "Security group for SpainBingo"

#### **Comandos de Security Groups**
```bash
# Ver Security Group del ALB
aws ec2 describe-security-groups --group-names spainbingo-alb-sg

# Ver Security Group de EC2
aws ec2 describe-security-groups --group-names spainbingo-sg

# Ver reglas de entrada
aws ec2 describe-security-group-rules --filters "Name=group-name,Values=spainbingo-alb-sg"
```

### **URLs de Acceso**

#### **Después de configurar ALB:**
```
HTTP:  http://[ALB_DNS]
HTTPS: https://[ALB_DNS] (con certificado)
Directo: http://[EC2_IP]:3000
```

#### **Información guardada en `alb-info.txt`:**
```
ALB_NAME=spainbingo-alb
ALB_ARN=arn:aws:elasticloadbalancing:...
ALB_DNS=spainbingo-alb-123456789.eu-west-1.elb.amazonaws.com
TARGET_GROUP_NAME=spainbingo-tg
TARGET_GROUP_ARN=arn:aws:elasticloadbalancing:...
```

### **Health Check Endpoint**

Tu aplicación debe tener un endpoint `/health`:

```javascript
// En server.js
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});
```

### **Ventajas de ALB vs Nginx**

| Característica | Nginx | ALB |
|----------------|-------|-----|
| **Gestión** | ❌ Manual | ✅ Automática |
| **SSL** | ❌ Manual | ✅ ACM automático |
| **Health Checks** | ❌ Básico | ✅ Avanzado |
| **Escalabilidad** | ❌ Limitada | ✅ Ilimitada |
| **Logs** | ❌ Archivos | ✅ CloudWatch |
| **Métricas** | ❌ Básicas | ✅ Detalladas |
| **WAF** | ❌ No incluido | ✅ Integrado |
| **Auto Scaling** | ❌ No | ✅ Sí |

## 📊 Monitoreo y Logs

### **PM2 Comandos**
```bash
pm2 start ecosystem.config.js    # Iniciar aplicación
pm2 restart spainbingo          # Reiniciar
pm2 stop spainbingo             # Detener
pm2 logs spainbingo             # Ver logs
pm2 monit                       # Monitor en tiempo real
```

### **systemd Comandos (Amazon Linux)**
```bash
sudo systemctl status spainbingo    # Estado del servicio
sudo systemctl restart spainbingo   # Reiniciar servicio
sudo systemctl enable spainbingo    # Habilitar auto-inicio
sudo systemctl disable spainbingo   # Deshabilitar auto-inicio
```

### **Logs del Sistema**
```bash
# Logs de la aplicación
tail -f /var/www/spainbingo/logs/combined.log

# Logs de Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs del sistema
sudo journalctl -u spainbingo -f
sudo journalctl -u nginx -f
```

## 🔄 Despliegue Continuo

### **Script de Despliegue Automático**
```bash
#!/bin/bash
# deploy-to-server.sh

# 1. Copiar archivos
scp -i spainbingo-key.pem -r . ec2-user@[IP]:/var/www/spainbingo/

# 2. Instalar dependencias
ssh -i spainbingo-key.pem ec2-user@[IP] 'cd /var/www/spainbingo && npm install'

# 3. Reiniciar aplicación
ssh -i spainbingo-key.pem ec2-user@[IP] 'pm2 restart spainbingo'
```

## 🌍 Configuración de Dominio

### **1. Configurar DNS**
```
A    spainbingo.es     [IP_PUBLICA]
A    www.spainbingo.es [IP_PUBLICA]
```

### **2. Configurar SSL**
```bash
# En el servidor Amazon Linux
sudo yum install -y certbot python3-certbot-nginx
sudo certbot --nginx -d spainbingo.es -d www.spainbingo.es
```

## 📈 Escalabilidad

### **Opciones de Escalado**
- **Vertical** - Aumentar tipo de instancia (t3.medium → t3.large)
- **Horizontal** - Múltiples instancias con Load Balancer
- **Base de datos** - Migrar a RDS o DynamoDB
- **CDN** - CloudFront para archivos estáticos

### **Monitoreo de Recursos**
```bash
# Uso de CPU y memoria
htop

# Uso de disco
df -h

# Conexiones de red
netstat -tulpn

# Servicios del sistema
sudo systemctl list-units --type=service
```

## 🛠️ Mantenimiento

### **Actualizaciones**
```bash
# Actualizar sistema Amazon Linux
sudo yum update -y

# Actualizar Node.js
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# Actualizar aplicación
git pull origin main
npm install
pm2 restart spainbingo
```

### **Backups**
```bash
# Backup de la aplicación
sudo tar -czf spainbingo-backup-$(date +%Y%m%d).tar.gz /var/www/spainbingo/

# Backup de logs
tar -czf logs-backup-$(date +%Y%m%d).tar.gz /var/www/spainbingo/logs/
```

## 🚨 Troubleshooting

### **Problemas Comunes**

#### **1. Aplicación no inicia**
```bash
# Verificar logs
pm2 logs spainbingo

# Verificar puerto
sudo netstat -tulpn | grep :3000

# Reiniciar PM2
pm2 delete spainbingo
pm2 start ecosystem.config.js

# Verificar servicio systemd
sudo systemctl status spainbingo
```

#### **2. Nginx no funciona**
```bash
# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx

# Verificar logs
sudo tail -f /var/log/nginx/error.log
```

#### **3. Problemas de conectividad**
```bash
# Verificar grupos de seguridad en AWS
aws ec2 describe-security-groups --group-names spainbingo-sg

# Verificar servicios
sudo systemctl list-units --type=service | grep -E "(nginx|spainbingo)"
```

## 🔧 Diferencias con Ubuntu

### **Amazon Linux vs Ubuntu**

| Característica | Amazon Linux | Ubuntu |
|----------------|--------------|--------|
| **Usuario** | ec2-user | ubuntu |
| **Gestor de paquetes** | yum | apt |
| **Configuración Nginx** | /etc/nginx/conf.d/ | /etc/nginx/sites-available/ |
| **Servicios** | systemd | systemd |
| **Optimización** | AWS nativa | Genérica |

### **Comandos Específicos de Amazon Linux**
```bash
# Instalar paquetes
sudo yum install -y [paquete]

# Actualizar sistema
sudo yum update -y

# Verificar servicios
sudo systemctl status [servicio]

# Configurar Nginx
sudo nano /etc/nginx/conf.d/spainbingo.conf
```

## 📞 Soporte

### **Información de Contacto**
- **Email**: soporte@spainbingo.es
- **Documentación**: [docs.spainbingo.es]
- **GitHub**: [github.com/spainbingo]

### **Logs de Error**
```bash
# Enviar logs para soporte
pm2 logs spainbingo --lines 100 > error-logs.txt
sudo journalctl -u spainbingo --lines 100 >> error-logs.txt
```

---

## 🎉 ¡Listo para Jugar!

Tu aplicación SpainBingo está ahora desplegada en un servidor EC2 con Amazon Linux, optimizado para AWS con todas las funcionalidades necesarias para un bingo online profesional.

**¡Disfruta del juego! 🎰** 