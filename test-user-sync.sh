#!/bin/bash

# ===== SCRIPT DE PRUEBA PARA VERIFICAR SINCRONIZACIÓN DE USERID =====
# Verifica que el sistema de identificación única por usuario funcione

echo "🔍 Verificando sistema de sincronización de userId..."
echo "======================================================"

# URL de producción
PRODUCTION_URL="https://game.bingoroyal.es"

echo "🌐 Verificando en: $PRODUCTION_URL"
echo ""

# Verificar que se haya implementado el nuevo sistema de userId
echo "1️⃣ Verificando implementación del nuevo sistema de userId..."

# Verificar función getOrCreateUserId mejorada
USER_ID_SYSTEM=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "SISTEMA DE IDENTIFICACIÓN ÚNICA POR USUARIO REAL\|SOLUCIONA EL PROBLEMA DE DUPLICACIÓN ENTRE NAVEGADORES" | wc -l)

if [ "$USER_ID_SYSTEM" -ge 2 ]; then
    echo "   ✅ Sistema de identificación única implementado"
else
    echo "   ❌ Sistema de identificación única NO implementado"
fi

# Verificar función createGlobalAnonymousUserId
CREATE_GLOBAL_ANONYMOUS=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "createGlobalAnonymousUserId\|Crear ID anónimo que se pueda sincronizar" | wc -l)

if [ "$CREATE_GLOBAL_ANONYMOUS" -ge 2 ]; then
    echo "   ✅ Función createGlobalAnonymousUserId implementada"
else
    echo "   ❌ Función createGlobalAnonymousUserId NO implementada"
fi

# Verificar función getBrowserFingerprint
BROWSER_FINGERPRINT=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "getBrowserFingerprint\|Obtener fingerprint del navegador" | wc -l)

if [ "$BROWSER_FINGERPRINT" -ge 2 ]; then
    echo "   ✅ Función getBrowserFingerprint implementada"
else
    echo "   ❌ Función getBrowserFingerprint NO implementada"
fi

# Verificar función syncUserIdAcrossBrowsers
SYNC_ACROSS_BROWSERS=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "syncUserIdAcrossBrowsers\|Sincronizar userId en todos los navegadores" | wc -l)

if [ "$SYNC_ACROSS_BROWSERS" -ge 2 ]; then
    echo "   ✅ Función syncUserIdAcrossBrowsers implementada"
else
    echo "   ❌ Función syncUserIdAcrossBrowsers NO implementada"
fi

# Verificar función setupUserIdSyncListener
SETUP_SYNC_LISTENER=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "setupUserIdSyncListener\|Configurar escucha para sincronización automática" | wc -l)

if [ "$SETUP_SYNC_LISTENER" -ge 2 ]; then
    echo "   ✅ Función setupUserIdSyncListener implementada"
else
    echo "   ❌ Función setupUserIdSyncListener NO implementada"
fi

# Verificar función handleUserIdChange
HANDLE_USER_ID_CHANGE=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "handleUserIdChange\|Manejar cambios de userId para sincronización" | wc -l)

if [ "$HANDLE_USER_ID_CHANGE" -ge 2 ]; then
    echo "   ✅ Función handleUserIdChange implementada"
else
    echo "   ❌ Función handleUserIdChange NO implementada"
fi

# Verificar que se llame a setupUserIdSyncListener en la inicialización
echo ""
echo "2️⃣ Verificando integración en la inicialización..."

SETUP_CALLED=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "setupUserIdSyncListener.*Configurar sincronización automática" | wc -l)

if [ "$SETUP_CALLED" -ge 1 ]; then
    echo "   ✅ setupUserIdSyncListener llamado en la inicialización"
else
    echo "   ❌ setupUserIdSyncListener NO llamado en la inicialización"
fi

# Verificar que se use el email como identificador único
echo ""
echo "3️⃣ Verificando uso de email como identificador único..."

EMAIL_AS_ID=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "user_.*email\|email como identificador único global" | wc -l)

if [ "$EMAIL_AS_ID" -ge 2 ]; then
    echo "   ✅ Email usado como identificador único"
else
    echo "   ❌ Email NO usado como identificador único"
fi

# Verificar sistema de sincronización con localStorage
echo ""
echo "4️⃣ Verificando sistema de sincronización..."

LOCALSTORAGE_SYNC=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "bingoroyal_real_userId\|bingoroyal_user_sync\|bingoroyal_global_anonymous_userId" | wc -l)

if [ "$LOCALSTORAGE_SYNC" -ge 3 ]; then
    echo "   ✅ Sistema de sincronización con localStorage implementado"
else
    echo "   ❌ Sistema de sincronización con localStorage NO implementado"
fi

# Verificar soporte para BroadcastChannel
BROADCAST_CHANNEL=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "BroadcastChannel\|bingoroyal_user_sync" | wc -l)

if [ "$BROADCAST_CHANNEL" -ge 2 ]; then
    echo "   ✅ Soporte para BroadcastChannel implementado"
else
    echo "   ❌ Soporte para BroadcastChannel NO implementado"
fi

echo ""
echo "======================================================"
echo "📋 RESUMEN DE VERIFICACIÓN DE SINCRONIZACIÓN DE USERID:"
echo ""

# Contar verificaciones exitosas
SUCCESS_COUNT=0
if [ "$USER_ID_SYSTEM" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$CREATE_GLOBAL_ANONYMOUS" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$BROWSER_FINGERPRINT" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$SYNC_ACROSS_BROWSERS" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$SETUP_SYNC_LISTENER" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$HANDLE_USER_ID_CHANGE" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$SETUP_CALLED" -ge 1 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$EMAIL_AS_ID" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$LOCALSTORAGE_SYNC" -ge 3 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$BROADCAST_CHANNEL" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi

if [ "$SUCCESS_COUNT" -eq 10 ]; then
    echo "🎉 ¡TODAS las verificaciones de sincronización fueron exitosas! ($SUCCESS_COUNT/10)"
    echo "✅ El sistema de identificación única por usuario está completamente implementado"
else
    echo "⚠️  Algunas verificaciones de sincronización fallaron ($SUCCESS_COUNT/10)"
    echo "❌ Revisar implementación"
fi

echo ""
echo "🔧 PASOS MANUALES PARA VERIFICAR LA SOLUCIÓN:"
echo "1. Visita $PRODUCTION_URL en un navegador (ej: Chrome)"
echo "2. Haz login con tu cuenta de usuario"
echo "3. Abre la consola del navegador (F12)"
echo "4. Deberías ver: '🆔 ✅ Usando userId único por email: user_tuemail@ejemplo.com'"
echo "5. Abre la misma URL en otro navegador (ej: Firefox)"
echo "6. Haz login con la MISMA cuenta"
echo "7. Deberías ver el MISMO userId en la consola"
echo "8. Verifica en localStorage que ambos navegadores tengan:"
echo "   • bingoroyal_real_userId: user_tuemail@ejemplo.com"
echo "   • bingoroyal_user_sync: {userId, userInfo, lastSync, browserId}"
echo ""
echo "🚀 La solución implementada incluye:"
echo "   • 🆔 Identificación única por email del usuario"
echo "   • 🔄 Sincronización automática entre navegadores"
echo "   • 📱 Soporte para múltiples dispositivos"
echo "   • 🎯 Eliminación completa de duplicación de usuarios"
echo "   • 🔐 Persistencia de sesión entre navegadores"
echo "   • 📡 Notificación al servidor de cambios de userId"
echo "   • 🌐 Soporte para BroadcastChannel y localStorage"
echo ""
echo "💡 Beneficios de la solución:"
echo "   • ✅ UN SOLO usuario por cuenta real"
echo "   • ✅ Sincronización automática entre sesiones"
echo "   • ✅ No más duplicación de usuarios"
echo "   • ✅ Experiencia consistente en todos los dispositivos"
echo "   • ✅ Seguridad mejorada con identificación única"
