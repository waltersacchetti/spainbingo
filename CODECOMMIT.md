# 🚀 AWS CodeCommit - SpainBingo

## 📋 Índice
1. [¿Qué es CodeCommit?](#qué-es-codecommit)
2. [Ventajas de CodeCommit](#ventajas-de-codecommit)
3. [Configuración Inicial](#configuración-inicial)
4. [Flujo de Trabajo](#flujo-de-trabajo)
5. [Scripts Disponibles](#scripts-disponibles)
6. [Comandos Útiles](#comandos-útiles)
7. [Solución de Problemas](#solución-de-problemas)

---

## 🔍 ¿Qué es CodeCommit?

**AWS CodeCommit** es un servicio de control de versiones Git completamente administrado que permite almacenar y gestionar código de forma segura en la nube de AWS.

### **Características Principales**
- ✅ **Git nativo**: Compatible 100% con Git
- ✅ **Seguridad**: Integrado con IAM y VPC
- ✅ **Escalabilidad**: Sin límites de repositorios
- ✅ **Integración AWS**: Conecta con otros servicios AWS
- ✅ **Sin mantenimiento**: AWS gestiona la infraestructura

---

## 🎯 Ventajas de CodeCommit

### **vs GitHub/GitLab**
| **Aspecto** | **CodeCommit** | **GitHub/GitLab** |
|-------------|----------------|-------------------|
| **Costo** | Gratis (hasta 5 usuarios) | Planes pagos |
| **Integración AWS** | Nativa | Requiere configuración |
| **Seguridad** | IAM + VPC | Configuración manual |
| **Escalabilidad** | Automática | Limitada |
| **Mantenimiento** | AWS gestiona | Tú gestionas |

### **Beneficios para SpainBingo**
- 🔒 **Seguridad**: Todo dentro del ecosistema AWS
- 🚀 **Velocidad**: Despliegue directo desde CodeCommit
- 💰 **Costo**: Gratis para proyectos pequeños
- 🔄 **Automatización**: Integración con CI/CD

---

## ⚙️ Configuración Inicial

### **Paso 1: Configuración Completa**
```bash
# Configurar todo automáticamente
./setup-codecommit.sh full-setup
```

### **Paso 2: Verificar Configuración**
```bash
# Ver información del repositorio
./setup-codecommit.sh info

# Ver comandos útiles
./setup-codecommit.sh commands
```

### **Paso 3: Primer Commit**
```bash
# Agregar archivos
git add .

# Commit inicial
git commit -m "Commit inicial - SpainBingo"

# Push a CodeCommit
git push origin main
```

---

## 🔄 Flujo de Trabajo

### **Desarrollo Diario**
```bash
# 1. Hacer cambios en tu código
# 2. Verificar cambios
git status

# 3. Agregar cambios
git add .

# 4. Commit con mensaje descriptivo
git commit -m "Agregar nueva funcionalidad de chat"

# 5. Push a CodeCommit
git push origin main

# 6. Desplegar a producción
./deploy-codecommit.sh deploy

# 7. Verificar despliegue
./deploy-codecommit.sh status
```

### **Trabajo con Ramas**
```bash
# Crear nueva rama
git checkout -b feature/nueva-funcionalidad

# Trabajar en la rama
# ... hacer cambios ...

# Commit y push de la rama
git add .
git commit -m "Implementar nueva funcionalidad"
git push origin feature/nueva-funcionalidad

# Desplegar rama específica
./deploy-codecommit.sh branch feature/nueva-funcionalidad

# Merge a main cuando esté listo
git checkout main
git merge feature/nueva-funcionalidad
git push origin main
```

### **Rollback y Recuperación**
```bash
# Ver commits recientes
git log --oneline -10

# Desplegar commit específico
./deploy-codecommit.sh commit abc123

# Rollback automático
./deploy-codecommit.sh rollback
```

---

## 🛠️ Scripts Disponibles

### **setup-codecommit.sh**
```bash
./setup-codecommit.sh [OPCIÓN]

Opciones:
  create-repo     - Crear repositorio en CodeCommit
  setup-local     - Configurar repositorio local
  setup-ec2       - Configurar CodeCommit en la EC2
  create-user     - Crear usuario IAM para CodeCommit
  info            - Mostrar información del repositorio
  commands        - Mostrar comandos Git útiles
  full-setup      - Configuración completa
  help            - Mostrar ayuda
```

### **deploy-codecommit.sh**
```bash
./deploy-codecommit.sh [OPCIÓN] [PARÁMETRO]

Opciones:
  deploy          - Desplegar desde CodeCommit (rama principal)
  branch [RAMA]   - Desplegar rama específica
  commit [HASH]   - Desplegar commit específico
  status          - Verificar estado de la aplicación
  rollback        - Revertir a versión anterior
  info            - Mostrar información del repositorio
  help            - Mostrar ayuda
```

---

## 💻 Comandos Útiles

### **Git Básico**
```bash
# Ver estado
git status

# Ver historial
git log --oneline -10

# Ver diferencias
git diff

# Ver ramas
git branch -a

# Cambiar rama
git checkout main
```

### **CodeCommit Específico**
```bash
# Clonar repositorio
git clone codecommit://eu-west-1/spainbingo

# Ver remotos
git remote -v

# Agregar remoto CodeCommit
git remote add origin codecommit://eu-west-1/spainbingo

# Push a CodeCommit
git push origin main
```

### **Despliegue**
```bash
# Despliegue rápido
./deploy-codecommit.sh deploy

# Despliegue de rama
./deploy-codecommit.sh branch develop

# Verificar estado
./deploy-codecommit.sh status

# Rollback
./deploy-codecommit.sh rollback
```

---

## 🔧 Solución de Problemas

### **Error: "Repository not found"**
```bash
# Verificar que el repositorio existe
./setup-codecommit.sh info

# Si no existe, crearlo
./setup-codecommit.sh create-repo
```

### **Error: "Authentication failed"**
```bash
# Verificar AWS CLI
aws sts get-caller-identity

# Configurar AWS CLI si es necesario
aws configure

# Instalar git-remote-codecommit
pip3 install git-remote-codecommit
```

### **Error: "Permission denied"**
```bash
# Verificar permisos IAM
aws iam get-user

# Crear usuario específico para CodeCommit
./setup-codecommit.sh create-user
```

### **Error: "Push failed"**
```bash
# Verificar estado local
git status

# Verificar remoto
git remote -v

# Reconfigurar remoto
git remote set-url origin codecommit://eu-west-1/spainbingo
```

### **Error: "Deploy failed"**
```bash
# Verificar estado de la EC2
./deploy-codecommit.sh status

# Ver logs
./ssm-manage.sh
# Opción: "Ver logs de la aplicación"

# Reiniciar aplicación
./deploy-codecommit.sh deploy
```

---

## 📊 Monitoreo y Logs

### **Ver Estado del Repositorio**
```bash
# Información del repositorio
./setup-codecommit.sh info

# Estado de la aplicación
./deploy-codecommit.sh status

# Logs de la aplicación
./ssm-manage.sh
# Opción: "Ver logs de la aplicación"
```

### **Ver Historial de Despliegues**
```bash
# En la EC2
cd /var/www/spainbingo
ls -la backup-before-deploy-*

# Ver commits recientes
git log --oneline -10
```

---

## 🎯 Mejores Prácticas

### **1. Mensajes de Commit Descriptivos**
```bash
# ✅ Bueno
git commit -m "Agregar sistema de autenticación con JWT"

# ❌ Malo
git commit -m "fix"
```

### **2. Usar Ramas para Features**
```bash
# Crear rama para nueva funcionalidad
git checkout -b feature/chat-tiempo-real

# Trabajar en la rama
# ... cambios ...

# Merge cuando esté listo
git checkout main
git merge feature/chat-tiempo-real
```

### **3. Verificar Antes de Desplegar**
```bash
# Verificar cambios
git status
git diff

# Probar localmente
# ... pruebas ...

# Desplegar
./deploy-codecommit.sh deploy
```

### **4. Hacer Backup Antes de Cambios Grandes**
```bash
# Backup automático (incluido en deploy)
./deploy-codecommit.sh deploy

# Backup manual
./deploy-update.sh backup
```

### **5. Monitorear Después del Despliegue**
```bash
# Verificar estado
./deploy-codecommit.sh status

# Ver logs
./deploy-codecommit.sh logs

# Probar funcionalidad
curl -I http://[ALB_DNS]/health
```

---

## 🔄 Automatización (Opcional)

### **Git Hooks**
```bash
# .git/hooks/pre-commit
#!/bin/bash
echo "Ejecutando tests antes del commit..."
npm test

# .git/hooks/post-commit
#!/bin/bash
echo "Commit realizado: $(git log -1 --oneline)"
```

### **Scripts de Automatización**
```bash
# deploy-auto.sh
#!/bin/bash
git add .
git commit -m "Auto-deploy: $(date)"
git push origin main
./deploy-codecommit.sh deploy
```

---

## 📞 Soporte

### **URLs Importantes**
- **CodeCommit Console**: https://eu-west-1.console.aws.amazon.com/codesuite/codecommit/repositories/spainbingo
- **AWS CLI**: https://docs.aws.amazon.com/cli/latest/reference/codecommit/
- **Documentación**: https://docs.aws.amazon.com/codecommit/

### **Comandos de Diagnóstico**
```bash
# Verificar AWS CLI
aws --version
aws sts get-caller-identity

# Verificar Git
git --version
git config --list

# Verificar CodeCommit
aws codecommit list-repositories --region eu-west-1
```

### **Archivos de Configuración**
- `~/.aws/credentials` - Credenciales AWS
- `~/.gitconfig` - Configuración Git
- `.git/` - Repositorio Git local

---

**¡Con CodeCommit tendrás un sistema de control de versiones profesional, seguro y completamente integrado con AWS! 🎯** 