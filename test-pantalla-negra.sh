#!/bin/bash

# ===== SCRIPT DE PRUEBA PARA SOLUCIÓN DE PANTALLA NEGRA =====
# Verifica que el preloader y las transiciones suaves estén funcionando

echo "🔍 Verificando solución para pantalla negra al recargar..."
echo "=================================================="

# URL de producción
PRODUCTION_URL="https://game.bingoroyal.es"

echo "🌐 Verificando en: $PRODUCTION_URL"
echo ""

# Verificar que el preloader esté presente en el HTML
echo "1️⃣ Verificando preloader en HTML..."
PRELOADER_HTML=$(curl -s "$PRODUCTION_URL" | grep -o "page-preloader" | head -1)

if [ "$PRELOADER_HTML" = "page-preloader" ]; then
    echo "   ✅ Preloader encontrado en HTML"
else
    echo "   ❌ Preloader NO encontrado en HTML"
fi

# Verificar que el CSS del preloader esté disponible
echo ""
echo "2️⃣ Verificando CSS del preloader..."
PRELOADER_CSS=$(curl -s "$PRODUCTION_URL/styles-codere.css" | grep -o "\.page-preloader" | head -1)

if [ "$PRELOADER_CSS" = ".page-preloader" ]; then
    echo "   ✅ CSS del preloader encontrado"
else
    echo "   ❌ CSS del preloader NO encontrado"
fi

# Verificar que las animaciones estén definidas
echo ""
echo "3️⃣ Verificando animaciones CSS..."
ANIMATIONS=$(curl -s "$PRODUCTION_URL/styles-codere.css" | grep -o "@keyframes fadeInBody\|@keyframes fadeInContainer\|@keyframes slideInDown\|@keyframes fadeInUp" | wc -l)

if [ "$ANIMATIONS" -ge 4 ]; then
    echo "   ✅ Todas las animaciones están definidas ($ANIMATIONS/4)"
else
    echo "   ❌ Faltan animaciones ($ANIMATIONS/4)"
fi

# Verificar que el JavaScript del preloader esté disponible
echo ""
echo "4️⃣ Verificando JavaScript del preloader..."
PRELOADER_JS=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "hidePreloader\|pagePreloader" | wc -l)

if [ "$PRELOADER_JS" -ge 2 ]; then
    echo "   ✅ JavaScript del preloader encontrado"
else
    echo "   ❌ JavaScript del preloader NO encontrado"
fi

# Verificar que el overlay móvil esté correctamente configurado
echo ""
echo "5️⃣ Verificando configuración del overlay móvil..."
OVERLAY_CONFIG=$(curl -s "$PRODUCTION_URL/styles-codere.css" | grep -o "\.mobile-menu-overlay.*opacity: 0.*visibility: hidden" | head -1)

if [ -n "$OVERLAY_CONFIG" ]; then
    echo "   ✅ Overlay móvil configurado correctamente (oculto por defecto)"
else
    echo "   ❌ Overlay móvil NO configurado correctamente"
fi

echo ""
echo "=================================================="
echo "📋 RESUMEN DE VERIFICACIÓN:"
echo ""

# Contar verificaciones exitosas
SUCCESS_COUNT=0
if [ "$PRELOADER_HTML" = "page-preloader" ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$PRELOADER_CSS" = ".page-preloader" ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$ANIMATIONS" -ge 4 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$PRELOADER_JS" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ -n "$OVERLAY_CONFIG" ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi

if [ "$SUCCESS_COUNT" -eq 5 ]; then
    echo "🎉 ¡TODAS las verificaciones fueron exitosas! ($SUCCESS_COUNT/5)"
    echo "✅ La solución para la pantalla negra está completamente implementada"
else
    echo "⚠️  Algunas verificaciones fallaron ($SUCCESS_COUNT/5)"
    echo "❌ Revisar implementación"
fi

echo ""
echo "🔧 PASOS MANUALES PARA VERIFICAR:"
echo "1. Visita $PRODUCTION_URL"
echo "2. Recarga la página (F5 o Ctrl+R)"
echo "3. Deberías ver un preloader suave en lugar de pantalla negra"
echo "4. La página debe aparecer con transiciones suaves"
echo "5. No debe haber flash de pantalla negra"
echo ""
echo "🚀 La solución incluye:"
echo "   • Preloader con spinner y texto"
echo "   • Transiciones suaves para todos los elementos"
echo "   • Fondo HTML consistente para evitar flash"
echo "   • Overlay móvil completamente oculto por defecto"
echo "   • Animaciones escalonadas para mejor UX"
