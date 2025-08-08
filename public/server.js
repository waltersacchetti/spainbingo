const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Importar configuración de base de datos
const { sequelize, testConnection } = require('./config/database');

// Importar modelos
const User = require('./models/User')(sequelize);

// ===== SISTEMA DE BINGO GLOBAL =====
class GlobalBingoGame {
    constructor() {
        this.gameState = 'waiting'; // waiting, playing, finished
        this.currentGameId = null;
        this.calledNumbers = [];
        this.availableNumbers = [];
        this.gameStartTime = null;
        this.nextGameTime = null;
        this.autoCallInterval = null;
        this.players = new Map(); // userId -> { cards: [], lastSeen: Date }
        this.gameHistory = [];
        this.currentPhase = 'early'; // early, mid, late
        this.lastNumberCalled = null;
        this.winners = [];
        
        // Configuración del juego
        this.gameDuration = 2 * 60 * 1000; // 2 minutos
        this.numberCallInterval = 3000; // 3 segundos entre números
        this.maxNumbersPerGame = 90;
        
        // Inicializar el juego global
        this.initializeGlobalGame();
    }
    
    initializeGlobalGame() {
        console.log('🎮 Inicializando Bingo Global...');
        this.generateNumberPool();
        this.scheduleNextGame();
        this.startGameScheduler();
    }
    
    generateNumberPool() {
        this.availableNumbers = [];
        for (let i = 1; i <= 90; i++) {
            this.availableNumbers.push(i);
        }
        console.log('🎲 Pool de números generado:', this.availableNumbers.length, 'números');
    }
    
    scheduleNextGame() {
        const now = new Date();
        this.nextGameTime = new Date(now.getTime() + this.gameDuration);
        console.log('⏰ Próxima partida global programada para:', this.nextGameTime);
    }
    
    startGameScheduler() {
        // Verificar cada segundo si es hora de iniciar una nueva partida
        setInterval(() => {
            this.checkGameSchedule();
        }, 1000);
    }
    
    checkGameSchedule() {
        if (this.gameState === 'waiting' && this.nextGameTime && new Date() >= this.nextGameTime) {
            this.startNewGame();
        }
    }
    
    startNewGame() {
        if (this.gameState === 'playing') {
            console.log('⚠️ Ya hay una partida en curso');
            return;
        }
        
        console.log('🎮 Iniciando nueva partida global...');
        
        // Resetear estado
        this.gameState = 'playing';
        this.currentGameId = 'global_' + Date.now();
        this.calledNumbers = [];
        this.winners = [];
        this.gameStartTime = new Date();
        this.currentPhase = 'early';
        this.lastNumberCalled = null;
        
        // Regenerar pool de números
        this.generateNumberPool();
        
        // Iniciar llamada automática de números
        this.startAutoCalling();
        
        // Programar fin de partida
        setTimeout(() => {
            this.endGame();
        }, this.gameDuration);
        
        console.log('✅ Nueva partida global iniciada:', this.currentGameId);
    }
    
    startAutoCalling() {
        if (this.autoCallInterval) {
            clearInterval(this.autoCallInterval);
        }
        
        this.autoCallInterval = setInterval(() => {
            this.callNextNumber();
        }, this.numberCallInterval);
    }
    
    callNextNumber() {
        if (this.gameState !== 'playing' || this.availableNumbers.length === 0) {
            return;
        }
        
        // Seleccionar número estratégico
        const number = this.selectStrategicNumber();
        
        if (number) {
            this.calledNumbers.push(number);
            this.lastNumberCalled = number;
            this.updateGamePhase();
            
            console.log('🔢 Número llamado globalmente:', number);
            
            // Verificar ganadores
            this.checkWinners();
        }
    }
    
    selectStrategicNumber() {
        if (this.availableNumbers.length === 0) return null;
        
        // Lógica estratégica basada en la fase del juego
        let selectedIndex;
        
        switch (this.currentPhase) {
            case 'early':
                // En fase temprana, llamar números más distribuidos
                selectedIndex = Math.floor(Math.random() * this.availableNumbers.length);
                break;
            case 'mid':
                // En fase media, llamar números estratégicos
                selectedIndex = Math.floor(Math.random() * this.availableNumbers.length);
                break;
            case 'late':
                // En fase tardía, llamar números más específicos
                selectedIndex = Math.floor(Math.random() * this.availableNumbers.length);
                break;
            default:
                selectedIndex = Math.floor(Math.random() * this.availableNumbers.length);
        }
        
        const number = this.availableNumbers[selectedIndex];
        this.availableNumbers.splice(selectedIndex, 1);
        
        return number;
    }
    
    updateGamePhase() {
        const progress = this.calledNumbers.length / this.maxNumbersPerGame;
        
        if (progress < 0.33) {
            this.currentPhase = 'early';
        } else if (progress < 0.66) {
            this.currentPhase = 'mid';
        } else {
            this.currentPhase = 'late';
        }
    }
    
    checkWinners() {
        // Verificar ganadores entre todos los jugadores
        for (const [userId, playerData] of this.players) {
            for (const card of playerData.cards) {
                const winType = this.checkCardWin(card);
                if (winType) {
                    this.winners.push({
                        userId,
                        cardId: card.id,
                        winType,
                        timestamp: new Date()
                    });
                    console.log('🏆 Ganador global detectado:', userId, winType);
                }
            }
        }
    }
    
    checkCardWin(card) {
        // Verificar líneas completadas
        const lines = this.checkCompletedLines(card);
        if (lines.length > 0) {
            return lines[0]; // Retornar el primer tipo de línea completada
        }
        return null;
    }
    
    checkCompletedLines(card) {
        const completedLines = [];
        
        // Verificar filas horizontales
        for (let row = 0; row < 3; row++) {
            if (this.isLineComplete(card, 'horizontal', row)) {
                completedLines.push('line');
            }
        }
        
        // Verificar columnas verticales
        for (let col = 0; col < 9; col++) {
            if (this.isLineComplete(card, 'vertical', col)) {
                completedLines.push('line');
            }
        }
        
        // Verificar diagonales
        if (this.isLineComplete(card, 'diagonal', 0)) {
            completedLines.push('line');
        }
        if (this.isLineComplete(card, 'diagonal', 1)) {
            completedLines.push('line');
        }
        
        // Verificar bingo completo
        if (this.isBingoComplete(card)) {
            completedLines.push('bingo');
        }
        
        return completedLines;
    }
    
    isLineComplete(card, type, index) {
        const numbers = card.numbers;
        let positions = [];
        
        switch (type) {
            case 'horizontal':
                positions = [index * 9, index * 9 + 1, index * 9 + 2, index * 9 + 3, index * 9 + 4, index * 9 + 5, index * 9 + 6, index * 9 + 7, index * 9 + 8];
                break;
            case 'vertical':
                positions = [index, index + 9, index + 18];
                break;
            case 'diagonal':
                if (index === 0) {
                    positions = [0, 10, 20];
                } else {
                    positions = [2, 10, 18];
                }
                break;
        }
        
        return positions.every(pos => {
            const row = Math.floor(pos / 9);
            const col = pos % 9;
            const number = numbers[row][col];
            return number && this.calledNumbers.includes(number);
        });
    }
    
    isBingoComplete(card) {
        return card.numbers.flat().every(cell => {
            if (cell === null) return true; // Espacios vacíos
            return this.calledNumbers.includes(cell);
        });
    }
    
    endGame() {
        console.log('🏁 Finalizando partida global...');
        
        this.gameState = 'finished';
        
        if (this.autoCallInterval) {
            clearInterval(this.autoCallInterval);
            this.autoCallInterval = null;
        }
        
        // Guardar historial
        this.gameHistory.push({
            gameId: this.currentGameId,
            startTime: this.gameStartTime,
            endTime: new Date(),
            calledNumbers: [...this.calledNumbers],
            winners: [...this.winners],
            totalPlayers: this.players.size
        });
        
        // Limpiar estado
        this.gameState = 'waiting';
        this.currentGameId = null;
        this.calledNumbers = [];
        this.winners = [];
        
        // Programar próxima partida
        this.scheduleNextGame();
        
        console.log('✅ Partida global finalizada');
    }
    
    // Métodos para clientes
    getGameState() {
        // Contar jugadores únicos (por userId)
        const uniquePlayers = this.players.size;
        
        // Contar sesiones activas (por sessionId)
        const activeSessions = Array.from(this.players.values()).length;
        
        return {
            gameState: this.gameState,
            gameId: this.currentGameId,
            calledNumbers: [...this.calledNumbers],
            lastNumberCalled: this.lastNumberCalled,
            gameStartTime: this.gameStartTime,
            nextGameTime: this.nextGameTime,
            currentPhase: this.currentPhase,
            totalPlayers: uniquePlayers, // Jugadores únicos
            activeSessions: activeSessions, // Sesiones activas
            winners: [...this.winners]
        };
    }
    
    joinPlayer(userId, cards = []) {
        console.log('🔍 DEBUG: joinPlayer llamado con userId:', userId);
        console.log('🔍 DEBUG: Tipo de userId:', typeof userId);
        console.log('🔍 DEBUG: Jugadores actuales:', Array.from(this.players.keys()));
        
        // Verificar si el jugador ya existe
        if (this.players.has(userId)) {
            // Actualizar la sesión existente
            const existingPlayer = this.players.get(userId);
            existingPlayer.cards = cards;
            existingPlayer.lastSeen = new Date();
            this.players.set(userId, existingPlayer);
            console.log('🔄 Sesión actualizada para jugador existente:', userId);
        } else {
            // Crear nueva sesión
            this.players.set(userId, {
                cards: cards,
                lastSeen: new Date(),
                sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
            });
            console.log('👤 Nuevo jugador unido al bingo global:', userId);
        }
        
        console.log('📊 Total de jugadores únicos conectados:', this.players.size);
        console.log('🔍 DEBUG: Lista completa de jugadores:', Array.from(this.players.keys()));
    }
    
    updatePlayerCards(userId, cards) {
        if (this.players.has(userId)) {
            const playerData = this.players.get(userId);
            playerData.cards = cards;
            playerData.lastSeen = new Date();
            this.players.set(userId, playerData);
            console.log('🔄 Cartones actualizados para jugador:', userId);
        } else {
            console.log('⚠️ Intento de actualizar cartones para jugador inexistente:', userId);
        }
    }
    
    removePlayer(userId) {
        this.players.delete(userId);
        console.log('👋 Jugador salió del bingo global:', userId);
    }
    
    cleanupInactivePlayers() {
        const now = new Date();
        const inactiveThreshold = 5 * 60 * 1000; // 5 minutos
        
        for (const [userId, playerData] of this.players) {
            if (now - playerData.lastSeen > inactiveThreshold) {
                this.removePlayer(userId);
            }
        }
    }
}

// Instancia global del bingo
const globalBingo = new GlobalBingoGame();

// Limpiar jugadores inactivos cada minuto
setInterval(() => {
    globalBingo.cleanupInactivePlayers();
}, 60 * 1000);

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
const loginLimiter = new RateLimiter(1 * 60 * 1000, 20); // 1 minuto, 20 intentos (menos restrictivo)
const apiLimiter = new RateLimiter(1 * 60 * 1000, 200); // 1 minuto, 200 requests (menos restrictivo)

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

// Middleware de logging para debug (MUY TEMPRANO)
app.use((req, res, next) => {
    console.log(`🔍 DEBUG - ${req.method} ${req.path}`);
    console.log(`🔍 DEBUG - URL:`, req.url);
    console.log(`🔍 DEBUG - Original URL:`, req.originalUrl);
    console.log(`🔍 DEBUG - Headers:`, Object.keys(req.headers));
    next();
});

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// Middleware de logging para debug (DESPUÉS de express.json)
app.use((req, res, next) => {
    console.log(`🔍 DEBUG - Body:`, JSON.stringify(req.body, null, 2));
    next();
});

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
        '52.212.178.26',
        'localhost',
        '127.0.0.1'
    ];
    
    // CORS más permisivo para desarrollo
    if (origin) {
        res.header('Access-Control-Allow-Origin', origin);
        console.log('✅ CORS permitido para origin:', origin);
    } else if (referer) {
        try {
            const refererUrl = new URL(referer);
            const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;
            res.header('Access-Control-Allow-Origin', refererOrigin);
            console.log('✅ CORS permitido para referer:', refererOrigin);
        } catch (e) {
            res.header('Access-Control-Allow-Origin', '*');
            console.log('✅ CORS permitido para todos los orígenes (fallback)');
        }
    } else {
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

app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'register.html'));
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

// Ruta de registro eliminada - usando la versión mejorada con UserManager

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

// Ruta de prueba para debug
app.post('/api/test-register', (req, res) => {
    console.log('🔍 TEST ROUTE - Datos recibidos:', JSON.stringify(req.body, null, 2));
    res.json({
        success: true,
        message: 'Ruta de prueba funcionando',
        data: req.body
    });
});

// API para registrar nuevo usuario (mejorado)
app.post('/api/register', async (req, res) => {
    try {
        const userData = req.body;
        const clientIP = req.ip || req.connection.remoteAddress;
        
        console.log('🔍 DEBUG - Datos recibidos en /api/register:', JSON.stringify(userData, null, 2));
        console.log('🔍 DEBUG - Headers:', JSON.stringify(req.headers, null, 2));
        
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

// API para enviar código de verificación
app.post('/api/verification/send', rateLimitMiddleware(loginLimiter), async (req, res) => {
    try {
        const { userId, method } = req.body;
        
        if (!userId || !method) {
            return res.status(400).json({
                success: false,
                error: 'ID de usuario y método de verificación son requeridos'
            });
        }

        if (!['email', 'sms'].includes(method)) {
            return res.status(400).json({
                success: false,
                error: 'Método de verificación inválido'
            });
        }

        const result = await UserManager.sendVerificationCode(userId, method);
        
        if (result.success) {
            res.json({
                success: true,
                message: result.message,
                expiresIn: result.expiresIn
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error al enviar código de verificación:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// API para verificar código
app.post('/api/verification/verify', rateLimitMiddleware(loginLimiter), async (req, res) => {
    try {
        const { userId, code } = req.body;
        
        if (!userId || !code) {
            return res.status(400).json({
                success: false,
                error: 'ID de usuario y código son requeridos'
            });
        }

        if (code.length !== 6) {
            return res.status(400).json({
                success: false,
                error: 'Código debe tener 6 dígitos'
            });
        }

        const result = await UserManager.verifyCode(userId, code);
        
        if (result.success) {
            // Limpiar caché del usuario
            userCache.removeCachedUser(userId);
            
            res.json({
                success: true,
                message: result.message
            });
        } else {
            res.status(400).json({
                success: false,
                error: result.error
            });
        }

    } catch (error) {
        console.error('Error al verificar código:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ========================================
// APIS DE BINGO GLOBAL
// ========================================

// API para obtener el estado actual del juego global
app.get('/api/bingo/state', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const gameState = globalBingo.getGameState();
        res.json({
            success: true,
            gameState: gameState
        });
    } catch (error) {
        console.error('Error obteniendo estado del bingo global:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estado del juego'
        });
    }
});

// API para unirse al juego global
app.post('/api/bingo/join', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const { userId, cards } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }
        
        globalBingo.joinPlayer(userId, cards || []);
        
        res.json({
            success: true,
            message: 'Jugador unido al bingo global',
            gameState: globalBingo.getGameState()
        });
    } catch (error) {
        console.error('Error uniendo jugador al bingo global:', error);
        res.status(500).json({
            success: false,
            error: 'Error uniendo al juego'
        });
    }
});

// API para actualizar cartones del jugador
app.post('/api/bingo/update-cards', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const { userId, cards } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }
        
        globalBingo.updatePlayerCards(userId, cards || []);
        
        res.json({
            success: true,
            message: 'Cartones actualizados'
        });
    } catch (error) {
        console.error('Error actualizando cartones:', error);
        res.status(500).json({
            success: false,
            error: 'Error actualizando cartones'
        });
    }
});

// API para salir del juego global
app.post('/api/bingo/leave', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }
        
        globalBingo.removePlayer(userId);
        
        res.json({
            success: true,
            message: 'Jugador salió del bingo global'
        });
    } catch (error) {
        console.error('Error sacando jugador del bingo global:', error);
        res.status(500).json({
            success: false,
            error: 'Error saliendo del juego'
        });
    }
});

// API para obtener estadísticas del juego global
app.get('/api/bingo/stats', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const stats = {
            totalPlayers: globalBingo.players.size,
            gameHistory: globalBingo.gameHistory.length,
            currentGameId: globalBingo.currentGameId,
            gameState: globalBingo.gameState,
            calledNumbersCount: globalBingo.calledNumbers.length,
            currentPhase: globalBingo.currentPhase,
            lastNumberCalled: globalBingo.lastNumberCalled,
            winnersCount: globalBingo.winners.length
        };
        
        res.json({
            success: true,
            stats: stats
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas del bingo global:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas'
        });
    }
});

// API para forzar inicio de nueva partida (solo para testing)
app.post('/api/bingo/force-start', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        if (globalBingo.gameState === 'waiting') {
            globalBingo.startNewGame();
            res.json({
                success: true,
                message: 'Nueva partida forzada',
                gameState: globalBingo.getGameState()
            });
        } else {
            res.json({
                success: false,
                message: 'No se puede forzar inicio, juego en curso',
                gameState: globalBingo.getGameState()
            });
        }
    } catch (error) {
        console.error('Error forzando inicio de partida:', error);
        res.status(500).json({
            success: false,
            error: 'Error forzando inicio'
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
    console.log(`🚀 Servidor SpainBingo iniciado en puerto ${PORT}`);
    console.log(`🌐 URL: http://localhost:${PORT}`);
    console.log(`🎮 Bingo Global inicializado`);
});

module.exports = app;
