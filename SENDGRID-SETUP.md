# 📧 Configuración de SendGrid como Alternativa a AWS SES

## 🚀 ¿Por qué SendGrid?

- **Gratis:** 100 emails/día
- **Fácil configuración**
- **Excelente deliverability**
- **Templates HTML predefinidos**
- **API simple y confiable**

## 📋 Pasos para Configurar SendGrid

### 1. Crear Cuenta en SendGrid
1. Ve a [sendgrid.com](https://sendgrid.com)
2. Haz clic en "Start for Free"
3. Completa el registro con tu información
4. Verifica tu email

### 2. Obtener API Key
1. En el dashboard, ve a **Settings > API Keys**
2. Haz clic en **"Create API Key"**
3. Dale un nombre (ej: "BingoRoyal Production")
4. Selecciona **"Full Access"** o **"Restricted Access"** (solo Mail Send)
5. Copia la API Key generada

### 3. Verificar Dominio (Opcional pero Recomendado)
1. Ve a **Settings > Sender Authentication**
2. Haz clic en **"Authenticate Your Domain"**
3. Sigue las instrucciones para agregar registros DNS
4. Esto mejora la deliverability

### 4. Configurar Variables de Entorno

Agrega estas variables al archivo `.env` del servidor:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.tu_api_key_aqui
SENDGRID_FROM_EMAIL=noreply@info.bingoroyal.es
SENDGRID_FROM_NAME=BingoRoyal
SENDGRID_TEMPLATE_ID=d-verification-template-id

# Cambiar servicio preferido (opcional)
PREFERRED_EMAIL_SERVICE=sendgrid
```

### 5. Instalar Dependencia

```bash
npm install @sendgrid/mail
```

## 🔧 Configuración en el Código

### Usar Solo SendGrid
```javascript
const SendGridService = require('./services/SendGridService');
const emailService = new SendGridService();
```

### Usar Servicio Híbrido (Recomendado)
```javascript
const HybridEmailService = require('./services/HybridEmailService');
const emailService = new HybridEmailService();

// Cambiar preferencia dinámicamente
emailService.setPreferredService('sendgrid');
```

## 📊 Ventajas vs Desventajas

### ✅ Ventajas de SendGrid
- **Setup más simple** que AWS SES
- **Dashboard intuitivo** para monitoreo
- **Templates HTML** predefinidos
- **Mejor soporte** para desarrolladores
- **Analytics detallados** de emails

### ⚠️ Desventajas de SendGrid
- **Límite gratuito** más bajo (100 vs 62,000 emails/mes)
- **Precio por email** más alto en planes pagos
- **Menos integración** con otros servicios AWS

## 🎯 Casos de Uso Recomendados

### Usar SendGrid cuando:
- **AWS SES no funciona** o tiene problemas
- **Necesitas templates HTML** complejos
- **Quieres analytics** detallados
- **Prefieres interfaz web** simple

### Usar AWS SES cuando:
- **Ya tienes infraestructura AWS**
- **Necesitas alto volumen** de emails
- **Quieres costos muy bajos**
- **Necesitas integración** con otros servicios AWS

## 🚨 Solución de Problemas

### Error: "SendGrid no está configurado"
```bash
# Verificar que la API key esté en .env
echo $SENDGRID_API_KEY

# Reiniciar PM2 con nuevas variables
pm2 restart 0 --update-env
```

### Error: "Unauthorized"
```bash
# Verificar que la API key sea válida
# Regenerar nueva API key en SendGrid
```

### Emails no llegan
```bash
# Verificar configuración de dominio
# Revisar logs de SendGrid en dashboard
# Verificar carpeta de spam
```

## 📈 Monitoreo y Analytics

### Dashboard de SendGrid
- **Email Activity:** Ver emails enviados/entregados
- **Bounce Management:** Gestionar emails rebotados
- **Spam Reports:** Monitorear reportes de spam
- **Deliverability Stats:** Estadísticas de entrega

### Logs de la Aplicación
```bash
# Ver logs de email
pm2 logs spainbingo | grep -E "(SendGrid|email|verificación)"
```

## 🔄 Migración desde AWS SES

1. **Configurar SendGrid** siguiendo los pasos arriba
2. **Cambiar variable** `PREFERRED_EMAIL_SERVICE=sendgrid`
3. **Reiniciar aplicación** con `pm2 restart 0 --update-env`
4. **Probar envío** de emails de verificación
5. **Monitorear logs** para confirmar funcionamiento

## 💡 Recomendación Final

**Usar el servicio híbrido** que permite:
- **Fallback automático** entre servicios
- **Cambio dinámico** de preferencia
- **Redundancia** en caso de fallos
- **Flexibilidad** para testing y producción 