const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Rate limiting simple (sin dependencias externas)
class RateLimiter {
    constructor(windowMs, max) {
        this.windowMs = windowMs;
        this.max = max;
        this.requests = new Map();
    }

    checkLimit(identifier) {
        const now = Date.now();
        const windowStart = now - this.windowMs;
        
        if (!this.requests.has(identifier)) {
            this.requests.set(identifier, []);
        }
        
        const requests = this.requests.get(identifier);
        
        // Limpiar requests antiguos
        const validRequests = requests.filter(time => time > windowStart);
        this.requests.set(identifier, validRequests);
        
        if (validRequests.length >= this.max) {
            return false;
        }
        
        validRequests.push(now);
        return true;
    }
}

// Configurar rate limiting
const loginLimiter = new RateLimiter(15 * 60 * 1000, 5); // 15 minutos, 5 intentos
const apiLimiter = new RateLimiter(15 * 60 * 1000, 100); // 15 minutos, 100 requests

// Middleware de rate limiting
function rateLimitMiddleware(limiter) {
    return (req, res, next) => {
        const identifier = req.ip || req.connection.remoteAddress;
        
        if (!limiter.checkLimit(identifier)) {
            return res.status(429).json({
                success: false,
                error: 'Demasiadas peticiones. Intenta de nuevo en 15 minutos.'
            });
        }
        
        next();
    };
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Configuración de seguridad
app.use((req, res, next) => {
    // Headers de seguridad
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'DENY');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;");
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // CORS configuration permisiva para ALB
    const origin = req.headers.origin;
    const host = req.headers.host;
    
    console.log('🌐 Origin recibido:', origin);
    console.log('🏠 Host recibido:', host);
    
    // Permitir cualquier origen para desarrollo/producción
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        console.log('✅ CORS permitido para:', origin);
    } else {
        // Si no hay origin, permitir el host actual
        res.header('Access-Control-Allow-Origin', '*');
        console.log('✅ CORS permitido para todos los orígenes');
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Audit-Token');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'entrada.html'));
});

app.get('/welcome', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Función de validación de entrada
function validateInput(data, rules) {
    for (const [field, rule] of Object.entries(rules)) {
        const value = data[field];
        
        if (rule.required && (!value || value.trim() === '')) {
            return { valid: false, error: `${field} es requerido` };
        }
        
        if (value && rule.type && typeof value !== rule.type) {
            return { valid: false, error: `${field} debe ser de tipo ${rule.type}` };
        }
        
        if (value && rule.minLength && value.length < rule.minLength) {
            return { valid: false, error: `${field} debe tener al menos ${rule.minLength} caracteres` };
        }
        
        if (value && rule.maxLength && value.length > rule.maxLength) {
            return { valid: false, error: `${field} no puede exceder ${rule.maxLength} caracteres` };
        }
        
        if (value && rule.pattern && !rule.pattern.test(value)) {
            return { valid: false, error: `${field} tiene formato inválido` };
        }
    }
    
    return { valid: true };
}

// Aplicar rate limiting
app.use('/api/', rateLimitMiddleware(apiLimiter));

// API endpoints para autenticación
app.post('/api/login', (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validación básica para login (más permisiva)
        if (!email || !password) {
            console.warn('⚠️ Intento de login con datos faltantes');
            return res.status(400).json({
                success: false,
                error: 'Email y contraseña son requeridos'
            });
        }

        // Validación de email básica
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.warn('⚠️ Intento de login con email inválido:', email);
            return res.status(400).json({
                success: false,
                error: 'Formato de email inválido'
            });
        }

        // Validación de contraseña básica (mínimo 1 carácter)
        if (password.length < 1) {
            console.warn('⚠️ Intento de login con contraseña vacía');
            return res.status(400).json({
                success: false,
                error: 'La contraseña es requerida'
            });
        }
        
        console.log('🔐 Login attempt:', { email, password: password ? '***' : 'missing' });
        
        // Simular autenticación exitosa (en producción esto verificaría contra la base de datos)
        const user = {
            id: 'user_' + Date.now(),
            username: email.split('@')[0],
            email: email,
            firstName: 'Usuario',
            lastName: 'Demo',
            balance: 1000,
            level: 'Bronce',
            avatar: 'default'
        };
        
        const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        console.log('✅ Login successful for:', email);
        
        res.json({
            success: true,
            user: user,
            token: token
        });
    } catch (error) {
        console.error('❌ Login error:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.post('/api/register', (req, res) => {
    try {
        const { username, email, password, firstName, lastName, dateOfBirth, phone } = req.body;
        
        console.log('📝 Register attempt:', { username, email, firstName, lastName });
        
        if (!username || !email || !password || !firstName || !lastName || !dateOfBirth) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos obligatorios son requeridos'
            });
        }
        
        // Simular registro exitoso (en producción esto guardaría en la base de datos)
        const user = {
            id: 'user_' + Date.now(),
            username: username,
            email: email,
            firstName: firstName,
            lastName: lastName,
            dateOfBirth: dateOfBirth,
            phone: phone || '',
            balance: 500,
            level: 'Bronce',
            avatar: 'default',
            createdAt: new Date().toISOString()
        };
        
        const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        console.log('✅ Registration successful for:', email);
        
        res.json({
            success: true,
            user: user,
            token: token
        });
    } catch (error) {
        console.error('❌ Registration error:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

app.post('/api/register-with-confirmation', (req, res) => {
    try {
        const { username, email, password, firstName, lastName, dateOfBirth, phone, confirmationMethod } = req.body;
        
        console.log('📝 Register with confirmation attempt:', { username, email, confirmationMethod });
        
        if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !confirmationMethod) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos obligatorios son requeridos'
            });
        }
        
        // Simular registro exitoso con confirmación pendiente
        const user = {
            id: 'user_' + Date.now(),
            username: username,
            email: email,
            firstName: firstName,
            lastName: lastName,
            dateOfBirth: dateOfBirth,
            phone: phone || '',
            confirmationMethod: confirmationMethod,
            isVerified: false,
            verificationCode: Math.floor(100000 + Math.random() * 900000).toString(),
            balance: 0,
            level: 'Bronce',
            avatar: 'default',
            createdAt: new Date().toISOString()
        };
        
        console.log('✅ Registration with confirmation successful for:', email);
        
        res.json({
            success: true,
            user: user,
            message: 'Cuenta creada. Por favor verifica tu ' + confirmationMethod
        });
    } catch (error) {
        console.error('❌ Registration with confirmation error:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para el juego
app.get('/api/game/numbers', (req, res) => {
    // Generar números aleatorios para el bingo
    const numbers = [];
    while (numbers.length < 90) {
        const num = Math.floor(Math.random() * 90) + 1;
        if (!numbers.includes(num)) {
            numbers.push(num);
        }
    }
    res.json({ numbers });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API health check
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        cors: 'configurado',
        endpoints: ['/api/login', '/api/test', '/api/health', '/api/users', '/api/chat']
    });
});

// API Chat endpoint
app.post('/api/chat', (req, res) => {
    try {
        const { message, userId, userName } = req.body;
        
        if (!message || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Mensaje y userId son requeridos'
            });
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
        
        res.json({
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
        });
    } catch (error) {
        console.error('Error en chat API:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando mensaje'
        });
    }
});

// API Chat GET endpoint para obtener mensajes
app.get('/api/chat', (req, res) => {
    res.json({
        success: true,
        messages: []
    });
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal!' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 SpainBingo servidor ejecutándose en puerto ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
});

module.exports = app;
