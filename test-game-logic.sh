#!/bin/bash

# 🎮 Script de Prueba para la Lógica Mejorada del Juego de Bingo
# Verifica que la nueva funcionalidad esté funcionando correctamente

echo "🎮 Probando la nueva lógica del juego de bingo..."
echo "=================================================="

# URL de la aplicación
APP_URL="https://game.bingoroyal.es"

echo ""
echo "🌐 Verificando archivos críticos en producción..."
echo "------------------------------------------------"

# Verificar que los archivos principales estén disponibles
echo "📁 Verificando archivos..."

# Verificar game-improvements.css
if curl -s "$APP_URL/game-improvements.css" | grep -q "ESTILOS PARA MEJORAS DEL JUEGO DE BINGO"; then
    echo "✅ game-improvements.css: DISPONIBLE y contiene estilos del juego"
else
    echo "❌ game-improvements.css: NO DISPONIBLE o contenido incorrecto"
fi

# Verificar script.js actualizado
if curl -s "$APP_URL/script.js" | grep -q "isGlobalGameActive"; then
    echo "✅ script.js: ACTUALIZADO con nueva lógica del juego"
else
    echo "❌ script.js: NO ACTUALIZADO - falta método isGlobalGameActive"
fi

# Verificar index.html con gameStatusMessage
if curl -s "$APP_URL/index.html" | grep -q "gameStatusMessage"; then
    echo "✅ index.html: ACTUALIZADO con elemento gameStatusMessage"
else
    echo "❌ index.html: NO ACTUALIZADO - falta elemento gameStatusMessage"
fi

echo ""
echo "🔍 Verificando funcionalidades específicas..."
echo "--------------------------------------------"

# Verificar métodos de bloqueo en script.js
echo "🔒 Verificando métodos de bloqueo..."

if curl -s "$APP_URL/script.js" | grep -q "canPurchaseCards"; then
    echo "✅ Método canPurchaseCards: IMPLEMENTADO"
else
    echo "❌ Método canPurchaseCards: NO IMPLEMENTADO"
fi

if curl -s "$APP_URL/script.js" | grep -q "updatePurchaseButtonsState"; then
    echo "✅ Método updatePurchaseButtonsState: IMPLEMENTADO"
else
    echo "❌ Método updatePurchaseButtonsState: NO IMPLEMENTADO"
fi

if curl -s "$APP_URL/script.js" | grep -q "syncGameStateWithServer"; then
    echo "✅ Método syncGameStateWithServer: IMPLEMENTADO"
else
    echo "❌ Método syncGameStateWithServer: NO IMPLEMENTADO"
fi

# Verificar estilos CSS específicos
echo ""
echo "🎨 Verificando estilos CSS..."
echo "----------------------------"

if curl -s "$APP_URL/game-improvements.css" | grep -q "btn-buy.disabled"; then
    echo "✅ Estilos para botones deshabilitados: IMPLEMENTADOS"
else
    echo "❌ Estilos para botones deshabilitados: NO IMPLEMENTADOS"
fi

if curl -s "$APP_URL/game-improvements.css" | grep -q "game-status"; then
    echo "✅ Estilos para mensajes de estado: IMPLEMENTADOS"
else
    echo "❌ Estilos para mensajes de estado: NO IMPLEMENTADOS"
fi

if curl -s "$APP_URL/game-improvements.css" | grep -q "blocked-indicator"; then
    echo "✅ Estilos para indicadores de bloqueo: IMPLEMENTADOS"
else
    echo "❌ Estilos para indicadores de bloqueo: NO IMPLEMENTADOS"
fi

echo ""
echo "📊 Resumen de la verificación:"
echo "==============================="

# Contar implementaciones exitosas
TOTAL_CHECKS=12
SUCCESS_COUNT=$(curl -s "$APP_URL/script.js" "$APP_URL/game-improvements.css" "$APP_URL/index.html" | grep -c "✅\|IMPLEMENTADO\|DISPONIBLE\|ACTUALIZADO" || echo "0")

echo "✅ Implementaciones exitosas: $SUCCESS_COUNT/$TOTAL_CHECKS"

if [ "$SUCCESS_COUNT" -eq "$TOTAL_CHECKS" ]; then
    echo "🎉 ¡TODAS las funcionalidades están implementadas correctamente!"
    echo "🚀 La nueva lógica del juego está lista para usar"
else
    echo "⚠️  Algunas funcionalidades pueden no estar completamente implementadas"
    echo "🔧 Revisa los errores anteriores y completa la implementación"
fi

echo ""
echo "🌐 Para probar la funcionalidad, visita:"
echo "   $APP_URL"
echo ""
echo "📋 Funcionalidades a verificar manualmente:"
echo "   1. Botones de compra se deshabilitan durante partidas activas"
echo "   2. Mensaje de estado del juego se actualiza correctamente"
echo "   3. Indicadores visuales de bloqueo aparecen en botones"
echo "   4. Sincronización con el servidor funciona"
echo "   5. No se pueden comprar cartones durante partidas activas"
