# 🚀 Guía de Despliegue y Actualizaciones - SpainBingo

## 📋 Índice
1. [Métodos de Actualización](#métodos-de-actualización)
2. [Configuración Inicial](#configuración-inicial)
3. [Flujo de Trabajo Recomendado](#flujo-de-trabajo-recomendado)
4. [Scripts Disponibles](#scripts-disponibles)
5. [Solución de Problemas](#solución-de-problemas)
6. [Mejores Prácticas](#mejores-prácticas)

---

## 🔄 Métodos de Actualización

### **1. Git Pull (Recomendado)**
```bash
# Actualizar desde repositorio Git
./deploy-update.sh git-pull
```

**Ventajas:**
- ✅ Control de versiones
- ✅ Rollback fácil
- ✅ Colaboración en equipo
- ✅ Historial de cambios

### **2. Upload de Archivos Locales**
```bash
# Subir archivos locales a la EC2
./deploy-update.sh upload
```

**Ventajas:**
- ✅ Despliegue rápido
- ✅ Sin configuración Git
- ✅ Ideal para pruebas

### **3. Despliegue Completo**
```bash
# Backup + Git Pull + Restart
./deploy-update.sh full-deploy
```

---

## ⚙️ Configuración Inicial

### **Paso 1: Configurar Git (Recomendado)**
```bash
# 1. Crear clave SSH
./setup-git.sh ssh

# 2. Agregar clave a tu repositorio (GitHub/GitLab)
# Copia la clave pública mostrada y agrégala a tu repositorio

# 3. Configurar repositorio en EC2
./setup-git.sh https://github.com/tu-usuario/spainbingo.git
```

### **Paso 2: Verificar Configuración**
```bash
# Verificar estado de la aplicación
./deploy-update.sh status

# Ver logs
./deploy-update.sh logs
```

---

## 🔄 Flujo de Trabajo Recomendado

### **Desarrollo Local**
```bash
# 1. Hacer cambios en tu código local
# 2. Probar localmente
# 3. Commit y push a Git
git add .
git commit -m "Nueva funcionalidad: [descripción]"
git push origin main
```

### **Despliegue a Producción**
```bash
# 1. Crear backup (automático en full-deploy)
./deploy-update.sh backup

# 2. Actualizar desde Git
./deploy-update.sh git-pull

# 3. Reiniciar aplicación
./deploy-update.sh restart

# 4. Verificar funcionamiento
./deploy-update.sh status
```

### **Despliegue Rápido (Todo en uno)**
```bash
./deploy-update.sh full-deploy
```

---

## 🛠️ Scripts Disponibles

### **deploy-update.sh**
```bash
./deploy-update.sh [OPCIÓN]

Opciones:
  git-pull     - Actualizar desde Git
  upload       - Subir archivos locales
  restart      - Reiniciar aplicación
  full-deploy  - Despliegue completo
  status       - Ver estado
  logs         - Ver logs
  backup       - Crear backup
  help         - Mostrar ayuda
```

### **setup-git.sh**
```bash
./setup-git.sh [OPCIÓN]

Opciones:
  [REPO_URL]   - Configurar repositorio
  ssh          - Configurar SSH key
  help         - Mostrar ayuda
```

### **ssm-manage.sh**
```bash
./ssm-manage.sh

# Menú interactivo para:
# - Conectar via SSM
# - Ver logs
# - Reiniciar servicios
# - Actualizar aplicación
```

---

## 🔧 Solución de Problemas

### **Error: "App no responde"**
```bash
# 1. Verificar logs
./deploy-update.sh logs

# 2. Verificar estado
./deploy-update.sh status

# 3. Reiniciar aplicación
./deploy-update.sh restart
```

### **Error: "Git pull failed"**
```bash
# 1. Verificar configuración Git
./setup-git.sh https://github.com/tu-usuario/spainbingo.git

# 2. Verificar permisos SSH
./setup-git.sh ssh
```

### **Error: "Port already in use"**
```bash
# 1. Verificar procesos
./ssm-manage.sh
# Opción: "Ver estado de la aplicación"

# 2. Matar proceso si es necesario
./ssm-manage.sh
# Opción: "Ejecutar comando personalizado"
# Comando: sudo pkill -f node
```

### **Error: "npm install failed"**
```bash
# 1. Verificar espacio en disco
./ssm-manage.sh
# Opción: "Ejecutar comando personalizado"
# Comando: df -h

# 2. Limpiar cache npm
./ssm-manage.sh
# Opción: "Ejecutar comando personalizado"
# Comando: npm cache clean --force
```

---

## 📊 Monitoreo y Logs

### **Ver Logs en Tiempo Real**
```bash
# Logs de la aplicación
./deploy-update.sh logs

# Logs del sistema
./ssm-manage.sh
# Opción: "Ver logs de la aplicación"
```

### **Verificar Estado**
```bash
# Estado completo
./deploy-update.sh status

# Estado específico
./ssm-manage.sh
# Opción: "Ver estado de la aplicación"
```

### **Métricas del Sistema**
```bash
./ssm-manage.sh
# Opción: "Ver métricas del sistema"
```

---

## 🎯 Mejores Prácticas

### **1. Siempre Hacer Backup**
```bash
# Antes de cualquier cambio importante
./deploy-update.sh backup
```

### **2. Usar Git para Control de Versiones**
```bash
# Configurar Git desde el inicio
./setup-git.sh https://github.com/tu-usuario/spainbingo.git
```

### **3. Probar en Desarrollo Primero**
```bash
# 1. Probar localmente
# 2. Commit y push
# 3. Desplegar a producción
./deploy-update.sh git-pull
```

### **4. Verificar Después del Despliegue**
```bash
# 1. Verificar estado
./deploy-update.sh status

# 2. Verificar logs
./deploy-update.sh logs

# 3. Probar funcionalidad
curl -I http://[ALB_DNS]/health
```

### **5. Mantener Logs Limpios**
```bash
# Rotar logs periódicamente
./ssm-manage.sh
# Opción: "Ejecutar comando personalizado"
# Comando: pm2 flush
```

---

## 🚨 Comandos de Emergencia

### **Reinicio Completo**
```bash
# 1. Reiniciar aplicación
./deploy-update.sh restart

# 2. Si no funciona, reiniciar servicios
./ssm-manage.sh
# Opción: "Reiniciar aplicación"
```

### **Rollback Rápido**
```bash
# 1. Verificar backups disponibles
./ssm-manage.sh
# Opción: "Ejecutar comando personalizado"
# Comando: ls -la /var/www/spainbingo-backup-*

# 2. Restaurar backup
./ssm-manage.sh
# Opción: "Ejecutar comando personalizado"
# Comando: cd /var/www && tar -xzf spainbingo-backup-[FECHA].tar.gz
```

### **Acceso Directo a la EC2**
```bash
# Conectar via SSM
./ssm-manage.sh
# Opción: "Conectar via SSM Session"
```

---

## 📞 Soporte

### **Archivos de Configuración**
- `ec2-info.txt` - Información de la instancia EC2
- `alb-info.txt` - Información del Application Load Balancer
- `ecosystem.config.js` - Configuración de PM2

### **Logs Importantes**
- `/var/www/spainbingo/logs/` - Logs de la aplicación
- `/var/log/cloud-init-output.log` - Logs de inicialización
- `journalctl -u spainbingo` - Logs del sistema

### **Comandos Útiles**
```bash
# Verificar espacio en disco
df -h

# Verificar memoria
free -h

# Verificar procesos
ps aux | grep node

# Verificar puertos
netstat -tlnp | grep :3000
```

---

## 🔄 Automatización (Opcional)

### **GitHub Actions**
```yaml
# .github/workflows/deploy.yml
name: Deploy to EC2
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Deploy to EC2
        run: |
          # Aquí puedes agregar comandos para automatizar el despliegue
          echo "Deploy automático desde GitHub"
```

### **Cron Jobs**
```bash
# Verificar estado cada hora
0 * * * * /path/to/deploy-update.sh status >> /var/log/spainbingo-cron.log
```

---

**¡Con estos scripts y guías, tendrás un flujo de trabajo profesional para mantener tu aplicación SpainBingo actualizada! 🎯** 