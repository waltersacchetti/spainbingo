# 🌍 Configuración del Dominio spain-bingo.es

## 📋 Información del Dominio

- **Dominio Principal:** `spain-bingo.es`
- **Subdominio www:** `www.spain-bingo.es`
- **ALB DNS:** `spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com`
- **Región AWS:** `eu-west-1`

## 🚀 Configuración Automática

### 1. Ejecutar Script de Configuración

```bash
./setup-domain.sh
```

Este script automáticamente:
- ✅ Verifica AWS CLI
- ✅ Obtiene información del ALB
- ✅ Crea certificado SSL
- ✅ Configura Route 53 (si está disponible)
- ✅ Configura HTTPS en el ALB

## 🔧 Configuración Manual (si es necesario)

### 1. Configurar DNS en tu Proveedor de Dominio

Si no usas Route 53, configura estos registros DNS en tu proveedor:

#### Registros CNAME:
```
spain-bingo.es → spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com
www.spain-bingo.es → spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com
```

#### O registros A (si prefieres):
```
spain-bingo.es → [IP del ALB]
www.spain-bingo.es → [IP del ALB]
```

### 2. Crear Certificado SSL

#### Opción A: AWS Certificate Manager (Recomendado)
```bash
aws acm request-certificate \
    --domain-name spain-bingo.es \
    --subject-alternative-names www.spain-bingo.es \
    --validation-method DNS \
    --region eu-west-1
```

#### Opción B: Let's Encrypt (Alternativo)
```bash
# Instalar certbot
sudo apt-get install certbot

# Obtener certificado
sudo certbot certonly --standalone -d spain-bingo.es -d www.spain-bingo.es
```

### 3. Configurar HTTPS en ALB

```bash
# Obtener ARN del certificado
CERT_ARN=$(aws acm list-certificates --query "CertificateSummaryList[?DomainName=='spain-bingo.es'].CertificateArn" --output text)

# Crear listener HTTPS
aws elbv2 create-listener \
    --load-balancer-arn [ALB_ARN] \
    --protocol HTTPS \
    --port 443 \
    --certificates CertificateArn=$CERT_ARN \
    --default-actions Type=forward,TargetGroupArn=[TARGET_GROUP_ARN]
```

## 🌐 URLs de la Aplicación

### URLs Principales:
- **HTTPS Principal:** https://spain-bingo.es
- **HTTPS www:** https://www.spain-bingo.es
- **HTTP ALB:** http://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com
- **HTTP EC2:** http://52.212.178.26:3000

### Páginas Específicas:
- **Login:** https://spain-bingo.es/login.html
- **Juego:** https://spain-bingo.es/index.html
- **Entrada:** https://spain-bingo.es/entrada.html
- **Términos:** https://spain-bingo.es/terms.html
- **Privacidad:** https://spain-bingo.es/privacy-policy.html

## 🔒 Seguridad

### Headers de Seguridad Configurados:
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-Frame-Options: DENY`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- ✅ `Content-Security-Policy`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy`

### CORS Configurado para:
- ✅ spain-bingo.es
- ✅ www.spain-bingo.es
- ✅ ALB DNS

## 📊 Monitoreo

### Verificar Estado:
```bash
# Verificar DNS
nslookup spain-bingo.es
dig spain-bingo.es

# Verificar HTTPS
curl -I https://spain-bingo.es

# Verificar ALB
aws elbv2 describe-load-balancers --names spainbingo-alb
```

### Logs:
```bash
# Ver logs del servidor
ssh -i spainbingo-key.pem ec2-user@52.212.178.26 'cd /var/www/spainbingo && pm2 logs spainbingo'
```

## 🚨 Troubleshooting

### Problema: Dominio no responde
1. Verificar registros DNS
2. Verificar que el ALB esté funcionando
3. Verificar que la instancia EC2 esté activa

### Problema: Certificado SSL no válido
1. Verificar que el certificado esté validado
2. Verificar que el dominio esté incluido en el certificado
3. Verificar que el listener HTTPS esté configurado

### Problema: CORS errors
1. Verificar configuración CORS en server.js
2. Verificar que el dominio esté en la lista de orígenes permitidos

## 📞 Soporte

Si tienes problemas con la configuración del dominio:

1. **Verificar logs:** `pm2 logs spainbingo`
2. **Verificar estado del ALB:** AWS Console → EC2 → Load Balancers
3. **Verificar certificado SSL:** AWS Console → Certificate Manager
4. **Verificar DNS:** Usar herramientas como `nslookup` o `dig`

## 🎯 Próximos Pasos

1. ✅ Configurar DNS
2. ✅ Crear certificado SSL
3. ✅ Configurar HTTPS
4. 🔄 Probar acceso HTTPS
5. 🔄 Configurar redirección HTTP → HTTPS
6. 🔄 Configurar CDN (opcional)
7. 🔄 Configurar monitoreo avanzado 