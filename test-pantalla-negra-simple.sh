#!/bin/bash

# ===== SCRIPT DE PRUEBA SIMPLIFICADO PARA PRELOADER =====
# Verifica que solo el preloader esté funcionando sin animaciones problemáticas

echo "🔍 Verificando preloader simplificado..."
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

# Verificar que NO haya animaciones problemáticas
echo ""
echo "3️⃣ Verificando que NO haya animaciones problemáticas..."
ANIMATIONS_PROBLEMATICAS=$(curl -s "$PRODUCTION_URL/styles-codere.css" | grep -o "@keyframes fadeInBody\|@keyframes fadeInContainer\|@keyframes slideInDown\|@keyframes fadeInUp" | wc -l)

if [ "$ANIMATIONS_PROBLEMATICAS" -eq 0 ]; then
    echo "   ✅ NO hay animaciones problemáticas"
else
    echo "   ❌ AÚN hay animaciones problemáticas ($ANIMATIONS_PROBLEMATICAS encontradas)"
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
OVERLAY_CHECK=$(curl -s "$PRODUCTION_URL/mobile-optimizations.css" | grep -A 10 "\.mobile-menu-overlay" | grep -E "(opacity: 0|visibility: hidden)" | wc -l)

if [ "$OVERLAY_CHECK" -ge 2 ]; then
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
if [ "$ANIMATIONS_PROBLEMATICAS" -eq 0 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$PRELOADER_JS" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$OVERLAY_CHECK" -ge 2 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi

if [ "$SUCCESS_COUNT" -eq 5 ]; then
    echo "🎉 ¡TODAS las verificaciones fueron exitosas! ($SUCCESS_COUNT/5)"
    echo "✅ El preloader simplificado está funcionando correctamente"
else
    echo "⚠️  Algunas verificaciones fallaron ($SUCCESS_COUNT/5)"
    echo "❌ Revisar implementación"
fi

echo ""
echo "🔧 PASOS MANUALES PARA VERIFICAR:"
echo "1. Visita $PRODUCTION_URL"
echo "2. Recarga la página (F5 o Ctrl+R)"
echo "3. Deberías ver un preloader suave en lugar de pantalla negra"
echo "4. La página debe aparecer NORMALMENTE (sin efectos borrosos)"
echo "5. No debe haber flash de pantalla negra"
echo ""
echo "🚀 La solución simplificada incluye:"
echo "   • Preloader con spinner y texto"
echo "   • Fondo HTML consistente para evitar flash"
echo "   • Overlay móvil completamente oculto por defecto"
echo "   • SIN animaciones CSS problemáticas"
echo "   • Carga limpia y rápida"
