exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };
    
    if (event.httpMethod === 'OPTIONS') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ message: 'OK' })
        };
    }
    
    if (event.httpMethod === 'GET') {
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                messages: []
            })
        };
    }
    
    if (event.httpMethod === 'POST') {
        try {
            const { message, userId, userName } = JSON.parse(event.body);
            
            if (!message || !userId) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        error: 'Mensaje y userId son requeridos'
                    })
                };
            }
            
            let botResponse = "¡Hola! Soy BingoBot 🤖. Escribe 'ayuda' para ver todos los comandos disponibles.";
            
            const lowerMsg = message.toLowerCase();
            
            if (lowerMsg.includes('ayuda') || lowerMsg.includes('help')) {
                botResponse = "🤖 **Comandos disponibles:**\n" +
                             "• 'premios' - Información sobre premios y horarios 🏆\n" +
                             "• 'reglas' - Reglas del juego 📋\n" +
                             "• 'como jugar' - Instrucciones para jugar 🎮\n" +
                             "• 'comprar' - Cómo comprar cartones 💳\n" +
                             "• 'problemas' - Ayuda con problemas técnicos 🔧\n" +
                             "• 'bot' - Información sobre mí 🤖";
            } else if (lowerMsg.includes('premio') || lowerMsg.includes('premios')) {
                botResponse = "🏆 **Premios SpainBingo:**\n" +
                             "• **Partidas normales:** Línea €50, Bingo €400\n" +
                             "• **Cada 2 horas:** Línea €150, Bingo €1,500\n" +
                             "• **Fines de semana 21:00:** Línea €500, Bingo €5,000\n" +
                             "• **Cartones:** €1 cada uno 💰";
            } else if (lowerMsg.includes('regla') || lowerMsg.includes('reglas')) {
                botResponse = "📋 **Reglas del Bingo:**\n" +
                             "• Números del 1 al 90 🎯\n" +
                             "• 15 números por cartón 📊\n" +
                             "• **Línea:** 5 números en horizontal ✨\n" +
                             "• **Bingo:** Todos los números del cartón 🏆\n" +
                             "• ¡El primero en completar gana! 🎉";
            } else if (lowerMsg.includes('hola') || lowerMsg.includes('buenos') || lowerMsg.includes('buenas')) {
                botResponse = "¡Hola! 👋 Soy BingoBot, tu asistente personal. ¿En qué puedo ayudarte? 🤖";
            } else if (lowerMsg.includes('como jugar') || lowerMsg.includes('como se juega')) {
                botResponse = "🎮 **Cómo jugar:**\n" +
                             "1. Compra cartones en 'Comprar Cartones' 💳\n" +
                             "2. Haz clic en 'Unirse a la Partida' 🎯\n" +
                             "3. Los números se llaman automáticamente 📢\n" +
                             "4. Marca los números que tienes en tus cartones ✅\n" +
                             "5. ¡Completa línea o bingo para ganar! 🏆";
            } else if (lowerMsg.includes('comprar') || lowerMsg.includes('carton')) {
                botResponse = "💳 **Cómo comprar cartones:**\n" +
                             "1. Ve a la pestaña 'Comprar Cartones' 🛒\n" +
                             "2. Selecciona la cantidad que quieres 📊\n" +
                             "3. Haz clic en 'Comprar Cartones' 💰\n" +
                             "4. Cada cartón cuesta €1 💵\n" +
                             "5. ¡Más cartones = más posibilidades de ganar! 🎯";
            } else if (lowerMsg.includes('problema') || lowerMsg.includes('error') || lowerMsg.includes('no funciona')) {
                botResponse = "🔧 **Solución de problemas:**\n" +
                             "• **Página lenta:** Recarga con Ctrl+F5 🔄\n" +
                             "• **No carga:** Verifica tu conexión a internet 🌐\n" +
                             "• **Navegador:** Usa Chrome, Firefox o Safari actualizado 💻\n" +
                             "• **Otros problemas:** Contacta soporte técnico 📞";
            }
            
            const now = new Date();
            const time = now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    userMessage: {
                        id: Date.now().toString(),
                        userId: userId,
                        userName: userName || 'Jugador',
                        message: message,
                        type: 'user',
                        timestamp: now.toISOString(),
                        time: time
                    },
                    botMessage: {
                        id: (Date.now() + 1).toString(),
                        userId: 'bot',
                        userName: 'BingoBot',
                        message: botResponse,
                        type: 'bot',
                        timestamp: now.toISOString(),
                        time: time
                    }
                })
            };
        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({
                    success: false,
                    error: 'Error procesando mensaje'
                })
            };
        }
    }
    
    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({
            success: false,
            error: 'Método no permitido'
        })
    };
}; 