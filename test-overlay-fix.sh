#!/bin/bash

# ===== SCRIPT DE PRUEBA PARA VERIFICAR ELIMINACIÓN DE OVERLAYS =====
# Verifica que se hayan eliminado los modales/overlays que causaban pantalla borrosa

echo "🔍 Verificando eliminación de overlays no deseados..."
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

# Verificar que se hayan agregado las reglas de prevención de modales
echo ""
echo "5️⃣ Verificando reglas de prevención de modales..."
MODAL_PREVENTION=$(curl -s "$PRODUCTION_URL/styles-codere.css" | grep -o "PREVENCIÓN DE MODALES NO DESEADOS\|\.modal:not\|\.modal-overlay:not" | wc -l)

if [ "$MODAL_PREVENTION" -ge 3 ]; then
    echo "   ✅ Reglas de prevención de modales encontradas"
else
    echo "   ❌ Reglas de prevención de modales NO encontradas"
fi

# Verificar que se haya agregado el código de limpieza de modales
echo ""
echo "6️⃣ Verificando código de limpieza de modales..."
MODAL_CLEANUP=$(curl -s "$PRODUCTION_URL/script.js" | grep -o "ELIMINACIÓN DE MODALES/OVERLAYS NO DESEADOS\|Eliminando modal visible no deseado\|Limpiando backdrop-filter no deseado" | wc -l)

if [ "$MODAL_CLEANUP" -ge 3 ]; then
    echo "   ✅ Código de limpieza de modales encontrado"
else
    echo "   ❌ Código de limpieza de modales NO encontrado"
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
if [ "$MODAL_PREVENTION" -ge 3 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi
if [ "$MODAL_CLEANUP" -ge 3 ]; then SUCCESS_COUNT=$((SUCCESS_COUNT + 1)); fi

if [ "$SUCCESS_COUNT" -eq 6 ]; then
    echo "🎉 ¡TODAS las verificaciones fueron exitosas! ($SUCCESS_COUNT/6)"
    echo "✅ La solución para eliminar overlays no deseados está implementada"
else
    echo "⚠️  Algunas verificaciones fallaron ($SUCCESS_COUNT/6)"
    echo "❌ Revisar implementación"
fi

echo ""
echo "🔧 PASOS MANUALES PARA VERIFICAR:"
echo "1. Visita $PRODUCTION_URL"
echo "2. Recarga la página (F5 o Ctrl+R)"
echo "3. Deberías ver un preloader suave en lugar de pantalla negra"
echo "4. La página debe aparecer NORMALMENTE (sin overlay oscuro)"
echo "5. No debe haber pantalla borrosa o overlay oscuro"
echo ""
echo "🚀 La solución incluye:"
echo "   • Preloader funcional para evitar pantalla negra"
echo "   • Eliminación automática de modales no deseados"
echo "   • Prevención CSS de modales por defecto"
echo "   • Limpieza de backdrop-filters problemáticos"
echo "   • Sin animaciones CSS problemáticas"
echo "   • Carga limpia y rápida"
