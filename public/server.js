const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Importar modelos
const User = require('./models/User');

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
    res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data:;");
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // CORS configuration permisiva para ALB
    const origin = req.headers.origin;
    const host = req.headers.host;
    const referer = req.headers.referer;
    
    console.log('🌐 Origin recibido:', origin);
    console.log('🏠 Host recibido:', host);
    console.log('📄 Referer recibido:', referer);
    
    // Lista de dominios permitidos
    const allowedDomains = [
        'spain-bingo.es',
        'www.spain-bingo.es',
        'spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com',
        'localhost',
        '127.0.0.1'
    ];
    
    // Para ALB, siempre permitir el origen
    if (origin) {
        const originHost = new URL(origin).hostname;
        if (allowedDomains.includes(originHost) || originHost.includes('localhost') || originHost.includes('127.0.0.1')) {
            res.header('Access-Control-Allow-Origin', origin);
            console.log('✅ CORS permitido para:', origin);
        } else {
            res.header('Access-Control-Allow-Origin', '*');
            console.log('⚠️ CORS permitido para dominio no listado:', origin);
        }
    } else if (referer) {
        // Si no hay origin pero hay referer, extraer el origen del referer
        try {
            const refererUrl = new URL(referer);
            const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
            const refererHost = refererUrl.hostname;
            
            if (allowedDomains.includes(refererHost) || refererHost.includes('localhost') || refererHost.includes('127.0.0.1')) {
                res.header('Access-Control-Allow-Origin', refererOrigin);
                console.log('✅ CORS permitido para referer:', refererOrigin);
            } else {
                res.header('Access-Control-Allow-Origin', '*');
                console.log('⚠️ CORS permitido para referer no listado:', refererOrigin);
            }
        } catch (e) {
            res.header('Access-Control-Allow-Origin', '*');
            console.log('✅ CORS permitido para todos los orígenes (fallback)');
        }
    } else {
        // Fallback: permitir todos los orígenes
        res.header('Access-Control-Allow-Origin', '*');
        console.log('✅ CORS permitido para todos los orígenes (sin origin/referer)');
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

// ========================================
// NUEVAS RUTAS DE GESTIÓN DE USUARIOS
// ========================================

// Importar el gestor de usuarios
const UserManager = require('./models/UserManager');
const userCache = require('./models/UserCache');

// API para obtener estadísticas de usuarios (solo admin)
app.get('/api/admin/users/stats', rateLimitMiddleware(apiLimiter), async (req, res) => {
    try {
        const stats = await UserManager.getUserStats();
        const cacheStats = UserManager.getCacheStats();
        
        res.json({
            success: true,
            stats: stats,
            cache: cacheStats
        });
    } catch (error) {
        console.error('Error al obtener estadísticas de usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para listar usuarios (solo admin)
app.get('/api/admin/users', rateLimitMiddleware(apiLimiter), async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const offset = (page - 1) * limit;
        
        const users = await User.findAll({
            order: [['created_at', 'DESC']],
            limit: limit,
            offset: offset,
            attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_verified', 'is_active', 'balance', 'created_at']
        });
        
        const total = await User.count();
        
        res.json({
            success: true,
            users: users.map(user => user.toJSON()),
            pagination: {
                page: page,
                limit: limit,
                total: total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error al listar usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para obtener usuario por ID
app.get('/api/admin/users/:id', rateLimitMiddleware(apiLimiter), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const user = await UserManager.getUserById(userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                error: 'Usuario no encontrado'
            });
        }
        
        res.json({
            success: true,
            user: user
        });
    } catch (error) {
        console.error('Error al obtener usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para registrar nuevo usuario (mejorado)
app.post('/api/register', rateLimitMiddleware(loginLimiter), async (req, res) => {
    try {
        const userData = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        
        const result = await UserManager.registerUser(userData, clientIP);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                user: result.user
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para actualizar usuario
app.put('/api/admin/users/:id', rateLimitMiddleware(apiLimiter), async (req, res) => {
    try {
        const userId = parseInt(req.params.id);
        const updateData = req.body;
        
        const result = await UserManager.updateUser(userId, updateData);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Usuario actualizado exitosamente',
                user: result.user
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error al actualizar usuario:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para cambiar contraseña
app.post('/api/users/change-password', rateLimitMiddleware(apiLimiter), async (req, res) => {
    try {
        const { userId, currentPassword, newPassword } = req.body;
        
        if (!userId || !currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                error: 'Todos los campos son requeridos'
            });
        }
        
        const result = await UserManager.changePassword(userId, currentPassword, newPassword);
        
        if (result.success) {
            res.json({
                success: true,
                message: 'Contraseña cambiada exitosamente'
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('Error al cambiar contraseña:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para obtener estadísticas del caché
app.get('/api/admin/cache/stats', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const stats = userCache.getCacheStats();
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error al obtener estadísticas del caché:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para limpiar caché
app.post('/api/admin/cache/clear', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        userCache.clearAllCache();
        
        res.json({
            success: true,
            message: 'Caché limpiado exitosamente'
        });
    } catch (error) {
        console.error('Error al limpiar caché:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
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
