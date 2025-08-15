const express = require('express');
const path = require('path');
const fs = require('fs');

// Las variables de entorno se cargan automáticamente por PM2

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración para HTTPS detrás de proxy (ALB)
app.set('trust proxy', true);
app.enable('trust proxy');

// Importar SendGridService (inicialización lazy)
const SendGridService = require('./services/SendGridService');
let emailService = null;

// Función para obtener EmailService de forma lazy
function getEmailService() {
    if (!emailService) {
        emailService = new SendGridService();
    }
    return emailService;
}

// Configuración de AWS Lambda
const AWS = require('aws-sdk');
AWS.config.update({
    region: 'eu-west-1'
    // No necesitamos credenciales explícitas, usamos el rol IAM del servidor
});

const lambda = new AWS.Lambda();
const CHAT_LAMBDA_FUNCTION_NAME = 'spainbingo-chat';

// Middleware para redirigir a dominio principal
app.use((req, res, next) => {
    const primaryDomain = 'game.bingoroyal.es';
    
    // NO redirigir rutas de health check, API internas o chat
    if (req.path.startsWith('/api/health') || 
        req.path.startsWith('/api/admin') ||
        req.path.startsWith('/api/chat') ||
        req.path === '/health' ||
        req.path === '/status') {
        return next();
    }
    
    // En producción, redirigir todos los dominios al dominio principal
    if (process.env.NODE_ENV === 'production' && 
        req.hostname !== 'localhost' && 
        req.hostname !== '127.0.0.1' &&
        req.hostname !== primaryDomain) {
        
        // Redirigir al dominio principal con HTTPS
        return res.redirect(`https://${primaryDomain}${req.url}`);
    }
    
    // Forzar HTTPS en el dominio principal
    if (process.env.NODE_ENV === 'production' && 
        req.hostname === primaryDomain &&
        !req.secure && 
        req.get('x-forwarded-proto') !== 'https') {
        
        return res.redirect(`https://${primaryDomain}${req.url}`);
    }
    
    next();
});

// Importar configuración de base de datos
const { sequelize, testConnection } = require('./config/database');

// Importar modelos
const User = require('./models/User')(sequelize);

// ===== GESTOR DE BINGOS GLOBALES MULTI-MODO =====
class GlobalBingoManager {
    constructor() {
        this.games = new Map(); // mode -> GlobalBingoGame
        this.activeModes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
        
        // Inicializar bingos para todos los modos
        this.initializeAllGames();
    }
    
    initializeAllGames() {
        console.log('🎮 Inicializando gestor de bingos globales...');
        
        this.activeModes.forEach(mode => {
            this.games.set(mode, new GlobalBingoGame(mode));
            console.log(`✅ Bingo ${mode} inicializado`);
        });
        
        console.log(`🎯 Total de bingos activos: ${this.games.size}`);
    }
    
    getGame(mode) {
        return this.games.get(mode) || this.games.get('CLASSIC');
    }
    
    getAllGames() {
        return this.games;
    }
    
    getGameState(mode) {
        const game = this.getGame(mode);
        return game ? game.getGameState() : null;
    }
    
    joinPlayer(mode, userId, cards = []) {
        const game = this.getGame(mode);
        if (game) {
            return game.joinPlayer(userId, cards);
        }
        return false;
    }
    
    updatePlayerCards(mode, userId, cards) {
        const game = this.getGame(mode);
        if (game) {
            game.updatePlayerCards(userId, cards);
        }
    }
    
    removePlayer(mode, userId) {
        const game = this.getGame(mode);
        if (game) {
            game.removePlayer(userId);
        }
    }
    
    getActivePlayersCount(mode) {
        const game = this.getGame(mode);
        return game ? game.players.size : 0;
    }
    
    getPlayersWithCardsCount(mode) {
        const game = this.getGame(mode);
        if (!game) return 0;
        
        return Array.from(game.players.values()).filter(player => 
            player.cards && player.cards.length > 0
        ).length;
    }
    
    getTotalActivePlayers() {
        let total = 0;
        this.games.forEach(game => {
            total += game.players.size;
        });
        return total;
    }
    
    getTotalPlayersWithCards() {
        let total = 0;
        this.games.forEach(game => {
            total += Array.from(game.players.values()).filter(player => 
                player.cards && player.cards.length > 0
            ).length;
        });
        return total;
    }
    
    getGlobalStats() {
        return {
            totalOnlinePlayers: this.getTotalActivePlayers(),
            totalPlayersWithCards: this.getTotalPlayersWithCards(),
            playersByMode: {}
        };
    }
}

// ===== SISTEMA DE BINGO GLOBAL MULTI-MODO =====
class GlobalBingoGame {
    constructor(gameMode = 'CLASSIC') {
        this.gameMode = gameMode;
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
        
        // Configuración específica por modo
        this.setGameModeConfiguration(gameMode);
        
        // Inicializar el juego global
        this.initializeGlobalGame();
    }
    
    setGameModeConfiguration(mode) {
        const configurations = {
            CLASSIC: {
                name: 'Bingo Clásico',
                gameDuration: 2 * 60 * 1000, // 2 minutos
                numberCallInterval: 3000, // 3 segundos
                maxNumbersPerGame: 90,
                prizes: { line: 10, twoLines: 25, bingo: 100 }
            },
            RAPID: {
                name: 'Bingo Rápido',
                gameDuration: 1 * 60 * 1000, // 1 minuto
                numberCallInterval: 1500, // 1.5 segundos
                maxNumbersPerGame: 90,
                prizes: { line: 15, twoLines: 40, bingo: 150 }
            },
            VIP: {
                name: 'Bingo VIP',
                gameDuration: 3 * 60 * 1000, // 3 minutos
                numberCallInterval: 4000, // 4 segundos
                maxNumbersPerGame: 90,
                prizes: { line: 25, twoLines: 75, bingo: 300 }
            },
            NIGHT: {
                name: 'Bingo Nocturno',
                gameDuration: 2.5 * 60 * 1000, // 2.5 minutos
                numberCallInterval: 3500, // 3.5 segundos
                maxNumbersPerGame: 90,
                prizes: { line: 20, twoLines: 60, bingo: 200 }
            }
        };
        
        const config = configurations[mode] || configurations.CLASSIC;
        this.gameDuration = config.gameDuration;
        this.numberCallInterval = config.numberCallInterval;
        this.maxNumbersPerGame = config.maxNumbersPerGame;
        this.prizes = config.prizes;
        this.modeName = config.name;
        
        console.log(`🎮 Configuración cargada para ${this.modeName}:`, {
            duration: `${this.gameDuration / 1000}s`,
            interval: `${this.numberCallInterval}ms`,
            prizes: this.prizes
        });
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
                    
                    // Terminar la partida automáticamente cuando hay un ganador
                    if (winType === 'bingo') {
                        console.log('🎉 ¡BINGO! Terminando partida automáticamente');
                        this.endGame();
                        return; // Salir de la función
                    }
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
        
        // Limpiar estado completamente
        this.gameState = 'waiting';
        this.currentGameId = null;
        this.calledNumbers = [];
        this.winners = [];
        this.lastNumberCalled = null;
        this.gameStartTime = null;
        this.currentPhase = 'early';
        
        // Programar próxima partida
        this.scheduleNextGame();
        
        console.log('✅ Partida global finalizada');
    }
    
    // Métodos para clientes
    getGameState() {
        // Contar jugadores únicos (por userId)
        const uniquePlayers = this.players.size;
        
        // Contar jugadores con cartones (que realmente están jugando)
        const playersWithCards = Array.from(this.players.values()).filter(player => 
            player.cards && player.cards.length > 0
        ).length;
        
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
            totalOnlinePlayers: uniquePlayers, // Jugadores logueados online
            playersWithCards: playersWithCards, // Jugadores con cartones comprados
            activeSessions: activeSessions, // Sesiones activas
            winners: [...this.winners]
        };
    }
    
    joinPlayer(userId, cards = []) {
        console.log('🔍 DEBUG: joinPlayer llamado con userId:', userId);
        console.log('🔍 DEBUG: Tipo de userId:', typeof userId);
        console.log('🔍 DEBUG: Jugadores actuales:', Array.from(this.players.keys()));
        
        // Verificar si el jugador ya existe (por email o userId)
        if (this.players.has(userId)) {
            // Actualizar la sesión existente
            const existingPlayer = this.players.get(userId);
            existingPlayer.cards = cards;
            existingPlayer.lastSeen = new Date();
            existingPlayer.sessionCount = (existingPlayer.sessionCount || 1); // Mantener contador de sesiones
            this.players.set(userId, existingPlayer);
            console.log('🔄 Sesión actualizada para jugador existente:', userId);
            console.log('📊 Sesiones activas para este usuario:', existingPlayer.sessionCount);
        } else {
            // Crear nueva sesión
            this.players.set(userId, {
                cards: cards,
                lastSeen: new Date(),
                sessionId: 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
                sessionCount: 1, // Contador de sesiones activas
                userId: userId // Guardar el userId para referencia
            });
            console.log('👤 Nuevo jugador unido al bingo global:', userId);
        }
        
        console.log('📊 Total de jugadores únicos conectados:', this.players.size);
        console.log('🔍 DEBUG: Lista completa de jugadores:', Array.from(this.players.keys()));
        
        // Log adicional para detectar duplicados
        if (userId.includes('@')) {
            console.log('📧 Usuario autenticado por email detectado:', userId);
        } else if (userId.startsWith('anonymous_')) {
            console.log('👤 Usuario anónimo detectado:', userId);
        }
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
    
    /**
     * Detectar y limpiar sesiones duplicadas del mismo usuario
     */
    cleanupDuplicateSessions() {
        const emailUsers = new Map(); // email -> userId más reciente
        
        // Agrupar usuarios por email
        for (const [userId, playerData] of this.players) {
            if (userId.includes('@')) {
                // Es un usuario autenticado por email
                if (!emailUsers.has(userId) || playerData.lastSeen > emailUsers.get(userId).lastSeen) {
                    emailUsers.set(userId, { userId, lastSeen: playerData.lastSeen });
                }
            }
        }
        
        // Remover sesiones duplicadas (manteniendo solo la más reciente)
        for (const [userId, playerData] of this.players) {
            if (userId.includes('@')) {
                const mostRecent = emailUsers.get(userId);
                if (mostRecent && mostRecent.userId !== userId) {
                    console.log(`🧹 Removiendo sesión duplicada: ${userId} (manteniendo: ${mostRecent.userId})`);
                    this.removePlayer(userId);
                }
            }
        }
    }
}

// Instancia global del gestor de bingos
const globalBingoManager = new GlobalBingoManager();

// Limpiar jugadores inactivos cada minuto para todos los modos
setInterval(() => {
    globalBingoManager.getAllGames().forEach(game => {
        game.cleanupInactivePlayers();
        game.cleanupDuplicateSessions(); // Limpiar sesiones duplicadas
    });
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
const loginLimiter = new RateLimiter(1 * 60 * 1000, 20); // 1 minuto, 20 intentos
const apiLimiter = new RateLimiter(1 * 60 * 1000, 200); // 1 minuto, 200 requests
const bingoApiLimiter = new RateLimiter(1 * 60 * 1000, 5000); // 1 minuto, 5000 requests para APIs del bingo (muy permisivo)

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
    res.header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com; img-src 'self' data: https:; connect-src 'self' https://game.bingoroyal.es;");
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // CORS configuration permisiva para ALB
    const origin = req.headers.origin;
    const host = req.headers.host;
    const referer = req.headers.referer;
    
    console.log('🌐 Origin recibido:', origin);
    console.log('🏠 Host recibido:', host);
    console.log('📄 Referer recibido:', referer);
    
    // Lista de dominios permitidos - Centralizado en game.bingoroyal.es
    const allowedDomains = [
        'game.bingoroyal.es',
        'bingoroyal.es', // Redirección opcional al dominio principal
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
    
    // Headers de seguridad para HTTPS
    res.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('X-Frame-Options', 'SAMEORIGIN');
    res.header('X-XSS-Protection', '1; mode=block');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.get('/welcome', (req, res) => {
    res.sendFile(path.join(__dirname, 'welcome.html'));
});

app.get('/entrada', (req, res) => {
    res.sendFile(path.join(__dirname, 'entrada.html'));
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

// Aplicar rate limiting solo a APIs específicas (excluir bingo APIs)
app.use('/api/admin/', rateLimitMiddleware(apiLimiter));
app.use('/api/users/', rateLimitMiddleware(apiLimiter));
app.use('/api/verification/', rateLimitMiddleware(loginLimiter));

// API endpoints para autenticación
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Validación básica para login
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

        // Validación de contraseña básica
        if (password.length < 1) {
            console.warn('⚠️ Intento de login con contraseña vacía');
            return res.status(400).json({
                success: false,
                error: 'La contraseña es requerida'
            });
        }
        
        console.log('🔐 Login attempt:', { email, password: password ? '***' : 'missing' });
        
        // 🔒 AUTENTICACIÓN REAL CON BASE DE DATOS RDS
        try {
            // Buscar usuario por email
            const user = await User.findOne({
                where: { email: email.toLowerCase() },
                attributes: ['id', 'username', 'email', 'password_hash', 'first_name', 'last_name', 'is_verified', 'is_active', 'balance', 'date_of_birth']
            });

            if (!user) {
                console.warn('❌ Usuario no encontrado:', email);
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            // Verificar si el usuario está activo
            if (!user.is_active) {
                console.warn('❌ Usuario inactivo:', email);
                return res.status(401).json({
                    success: false,
                    error: 'Cuenta desactivada. Contacta con soporte.'
                });
            }

            // Verificar contraseña usando bcrypt
            const isPasswordValid = await user.verifyPassword(password);
            if (!isPasswordValid) {
                console.warn('❌ Contraseña incorrecta para usuario:', email);
                return res.status(401).json({
                    success: false,
                    error: 'Credenciales inválidas'
                });
            }

            // Verificar edad mínima (18 años)
            if (!user.isAdult()) {
                console.warn('❌ Usuario menor de edad:', email);
                return res.status(403).json({
                    success: false,
                    error: 'Debes ser mayor de 18 años para acceder'
                });
            }

            // Verificar auto-exclusión
            if (user.isSelfExcluded()) {
                console.warn('❌ Usuario con auto-exclusión activa:', email);
                return res.status(403).json({
                    success: false,
                    error: 'Tu cuenta tiene restricciones activas. Contacta con soporte.'
                });
            }

            // Actualizar último login
            await user.update({ last_login: new Date() });

            // Generar token JWT (en producción usar jsonwebtoken)
            const token = 'auth_token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            // Preparar respuesta del usuario (sin datos sensibles)
            const userResponse = {
                id: user.id,
                username: user.username,
                email: user.email,
                firstName: user.first_name || 'Usuario',
                lastName: user.last_name || 'BingoRoyal',
                balance: parseFloat(user.balance || 0),
                level: user.getLevel ? user.getLevel() : 'Bronce',
                avatar: 'default',
                isVerified: user.is_verified,
                lastLogin: user.last_login
            };
            
            console.log('✅ Login exitoso para usuario:', email, 'ID:', user.id);
            
            res.json({
                success: true,
                user: userResponse,
                token: token
            });

        } catch (dbError) {
            console.error('❌ Error de base de datos durante login:', dbError);
            return res.status(500).json({
                success: false,
                error: 'Error interno del servidor. Intenta más tarde.'
            });
        }

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
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Test endpoint para verificar SendGrid
app.post('/api/test-sendgrid', async (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                error: 'Email es requerido'
            });
        }

        console.log('🧪 Probando envío de email con SendGrid a:', email);
        
        // Enviar email de prueba
                    const result = await getEmailService().sendVerificationEmail(email, '123456', 'UsuarioTest');
        
        res.json({
            success: true,
            message: 'Email de prueba enviado exitosamente',
            result: result
        });
        
    } catch (error) {
        console.error('❌ Error en test de SendGrid:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar email de prueba: ' + error.message
        });
    }
});

// Test endpoint para verificar UserManager
app.post('/api/test-usermanager', async (req, res) => {
    try {
        console.log('🧪 Probando UserManager...');
        
        // Crear instancia de UserManager
        const UserManager = require('./models/UserManager');
        const userManager = new UserManager();
        
        console.log('✅ UserManager creado exitosamente');
        
        // Probar servicio de verificación
        const verificationService = userManager.getVerificationService();
        console.log('✅ VerificationService obtenido:', !!verificationService);
        
        res.json({
            success: true,
            message: 'UserManager funcionando correctamente',
            verificationService: !!verificationService
        });
        
    } catch (error) {
        console.error('❌ Error en test de UserManager:', error);
        res.status(500).json({
            success: false,
            error: 'Error en UserManager: ' + error.message
        });
    }
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

// API Chat endpoint - Conectado a AWS Lambda con fallback local
app.post('/api/chat', async (req, res) => {
    try {
        const { message, userId, userName } = req.body;
        
        if (!message || !userId) {
            return res.status(400).json({
                success: false,
                error: 'Mensaje y userId son requeridos'
            });
        }
        
        // Generar respuesta del bot localmente
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
        } else if (lowerMsg.includes('premios')) {
            botResponse = "🏆 **Premios disponibles:**\n" +
                         "• **Línea:** 5€ - 15€ (dependiendo del modo)\n" +
                         "• **Dos líneas:** 15€ - 45€\n" +
                         "• **Bingo completo:** 50€ - 150€\n" +
                         "• **Bote progresivo:** Varía según acumulación 🎯";
        } else if (lowerMsg.includes('reglas')) {
            botResponse = "📋 **Reglas del Bingo:**\n" +
                         "• Marca los números que se van llamando en tus cartones\n" +
                         "• Gana con línea horizontal, dos líneas o bingo completo\n" +
                         "• Los premios se pagan automáticamente al final de cada partida\n" +
                         "• ¡Disfruta del juego y buena suerte! 🍀";
        } else if (lowerMsg.includes('como jugar')) {
            botResponse = "🎮 **Cómo jugar:**\n" +
                         "• Compra cartones antes de que empiece la partida\n" +
                         "• Los números se llaman automáticamente\n" +
                         "• Marca los números en tus cartones cuando aparezcan\n" +
                         "• ¡El primero en completar línea, dos líneas o bingo gana! 🎯";
        } else if (lowerMsg.includes('comprar')) {
            botResponse = "💳 **Cómo comprar cartones:**\n" +
                         "• Haz clic en 'Comprar Cartones' en la interfaz\n" +
                         "• Selecciona la cantidad que desees\n" +
                         "• Confirma la compra\n" +
                         "• Los cartones se añaden automáticamente a tu cuenta";
        } else if (lowerMsg.includes('problemas')) {
            botResponse = "🔧 **Solución de problemas:**\n" +
                         "• **Página lenta:** Recarga con Ctrl+F5 🔄\n" +
                         "• **No carga:** Verifica tu conexión a internet 🌐\n" +
                         "• **Navegador:** Usa Chrome, Firefox o Safari actualizado 💻\n" +
                         "• **Otros problemas:** Contacta soporte técnico 📞";
        } else if (lowerMsg.includes('bot')) {
            botResponse = "🤖 **Sobre mí:**\n" +
                         "• Soy BingoBot, tu asistente virtual\n" +
                         "• Te ayudo con información del juego y soporte\n" +
                         "• Escribe 'ayuda' para ver todos los comandos disponibles\n" +
                         "• ¡Estoy aquí para ayudarte a disfrutar del Bingo! 😊";
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
        console.error('❌ Error en chat API:', error);
        
        // Fallback completo si hay error
        const { message, userId, userName } = req.body;
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
                message: "¡Hola! Soy BingoBot 🤖. Escribe 'ayuda' para ver todos los comandos disponibles.",
                type: 'bot',
                timestamp: now.toISOString(),
                time: time
            }
        });
    }
});

// API Chat GET endpoint - Conectado a AWS Lambda
// API Chat GET endpoint - Respuesta local simple
app.get('/api/chat', (req, res) => {
    try {
        res.json({
            success: true,
            messages: [
                {
                    id: '1',
                    userId: 'bot',
                    userName: 'BingoBot',
                    message: '¡Bienvenido al chat de BingoRoyal! 🎉',
                    type: 'bot',
                    timestamp: new Date().toISOString(),
                    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                },
                {
                    id: '2',
                    userId: 'bot',
                    userName: 'BingoBot',
                    message: 'Escribe "ayuda" para ver todos los comandos disponibles 🤖',
                    type: 'bot',
                    timestamp: new Date().toISOString(),
                    time: new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
                }
            ]
        });
    } catch (error) {
        console.error('❌ Error en chat API (GET):', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
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
        const userManager = new UserManager();
        const user = await userManager.getUserById(userId);
        
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
        
        console.log('🔍 Registro de usuario:', { email: userData.email, username: userData.username, ip: clientIP });
        
        // Verificar que UserManager esté disponible
        const UserManager = require('./models/UserManager');
        const userManager = new UserManager();
        
        // Llamar al método de registro
        const result = await userManager.registerUser(userData, clientIP);
        
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
        console.error('❌ Error en registro:', error);
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
app.post('/api/verification/send', async (req, res) => {
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

        const userManager = new UserManager();
        const result = await userManager.sendVerificationCode(userId, method);
        
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

        const userManager = new UserManager();
        const result = await userManager.verifyCode(userId, code);
        
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

// API para verificar email por token (desde URL)
app.get('/api/verification/verify-token', async (req, res) => {
    try {
        const { token, email } = req.query;
        
        if (!token || !email) {
            return res.status(400).json({
                success: false,
                error: 'Token y email son requeridos'
            });
        }

        const verificationService = require('./services/VerificationService');
        const result = await verificationService.verifyByToken(email, token);
        
        if (result.success) {
            // Redirigir a página de éxito
            res.redirect('/verification?status=success&message=' + encodeURIComponent('Email verificado exitosamente'));
        } else {
            res.redirect('/verification?status=error&message=' + encodeURIComponent(result.error));
        }

    } catch (error) {
        console.error('Error al verificar token:', error);
        res.redirect('/verification?status=error&message=' + encodeURIComponent('Error interno del servidor'));
    }
});

// API para test de conexión SendGrid
app.get('/api/admin/sendgrid-test', async (req, res) => {
    try {
        const result = await getEmailService().healthCheck();
        
        res.json({
            success: result.success,
            message: result.success ? 'Conexión SendGrid exitosa' : 'Error en conexión SendGrid',
            data: result.details || null,
            error: result.error || null
        });

    } catch (error) {
        console.error('Error al probar SendGrid:', error);
        res.status(500).json({
            success: false,
            error: 'Error interno del servidor'
        });
    }
});

// ========================================
// APIS DE BINGO GLOBAL
// ========================================

// API para obtener el estado actual del juego global por modo
app.get('/api/bingo/state', rateLimitMiddleware(bingoApiLimiter), (req, res) => {
    try {
        const { mode = 'CLASSIC' } = req.query;
        const gameState = globalBingoManager.getGameState(mode);
        
        if (!gameState) {
            return res.status(404).json({
                success: false,
                error: 'Modo de juego no encontrado'
            });
        }
        
        res.json({
            success: true,
            gameState: gameState,
            mode: mode
        });
    } catch (error) {
        console.error('Error obteniendo estado del bingo global:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estado del juego'
        });
    }
});

// API para unirse al juego global por modo
app.post('/api/bingo/join', rateLimitMiddleware(bingoApiLimiter), (req, res) => {
    try {
        const { userId, cards, mode = 'CLASSIC' } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }
        
        const success = globalBingoManager.joinPlayer(mode, userId, cards || []);
        
        if (!success) {
            return res.status(400).json({
                success: false,
                error: 'No se pudo unir al modo de juego'
            });
        }
        
        res.json({
            success: true,
            message: `Jugador unido al ${mode}`,
            gameState: globalBingoManager.getGameState(mode),
            mode: mode
        });
    } catch (error) {
        console.error('Error uniendo jugador al bingo global:', error);
        res.status(500).json({
            success: false,
            error: 'Error uniendo al juego'
        });
    }
});

// API para actualizar cartones del jugador por modo
app.post('/api/bingo/update-cards', rateLimitMiddleware(bingoApiLimiter), (req, res) => {
    try {
        const { userId, cards, mode = 'CLASSIC' } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }
        
        globalBingoManager.updatePlayerCards(mode, userId, cards || []);
        
        res.json({
            success: true,
            message: 'Cartones actualizados',
            mode: mode
        });
    } catch (error) {
        console.error('Error actualizando cartones:', error);
        res.status(500).json({
            success: false,
            error: 'Error actualizando cartones'
        });
    }
});

// API para resetear cartones del jugador por modo
app.post('/api/bingo/reset-cards', rateLimitMiddleware(bingoApiLimiter), (req, res) => {
    try {
        const { userId, mode = 'CLASSIC' } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }
        
        // 🗑️ RESETEAR CARTONES EN EL BACKEND
        globalBingoManager.updatePlayerCards(mode, userId, []);
        
        console.log(`🗑️ Cartones reseteados para usuario ${userId} en modo ${mode}`);
        
        res.json({
            success: true,
            message: `Cartones reseteados a 0 para modo ${mode}`,
            mode: mode,
            cardsCount: 0
        });
    } catch (error) {
        console.error('Error reseteando cartones:', error);
        res.status(500).json({
            success: false,
            error: 'Error reseteando cartones'
        });
    }
});

// API para salir del juego global por modo
app.post('/api/bingo/leave', rateLimitMiddleware(bingoApiLimiter), (req, res) => {
    try {
        const { userId, mode = 'CLASSIC' } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }
        
        globalBingoManager.removePlayer(mode, userId);
        
        res.json({
            success: true,
            message: `Jugador salió del ${mode}`,
            mode: mode
        });
    } catch (error) {
        console.error('Error sacando jugador del bingo global:', error);
        res.status(500).json({
            success: false,
            error: 'Error saliendo del juego'
        });
    }
});

// API para obtener estadísticas del juego global por modo
app.get('/api/bingo/stats', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const { mode = 'CLASSIC' } = req.query;
        const game = globalBingoManager.getGame(mode);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Modo de juego no encontrado'
            });
        }
        
        const gameState = game.getGameState();
        
        const stats = {
            mode: mode,
            totalOnlinePlayers: gameState.totalOnlinePlayers,
            playersWithCards: gameState.playersWithCards,
            gameHistory: game.gameHistory.length,
            currentGameId: game.currentGameId,
            gameState: game.gameState,
            calledNumbersCount: game.calledNumbers.length,
            currentPhase: game.currentPhase,
            lastNumberCalled: game.lastNumberCalled,
            winnersCount: game.winners.length,
            gameDuration: game.gameDuration,
            numberCallInterval: game.numberCallInterval,
            modeName: game.modeName
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

// API para obtener estadísticas globales de todos los modos
app.get('/api/bingo/global-stats', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const globalStats = globalBingoManager.getGlobalStats();
        
        // Agregar estadísticas por modo
        globalBingoManager.activeModes.forEach(mode => {
            const game = globalBingoManager.getGame(mode);
            if (game) {
                const gameState = game.getGameState();
                globalStats.playersByMode[mode] = {
                    totalOnlinePlayers: gameState.totalOnlinePlayers,
                    playersWithCards: gameState.playersWithCards,
                    gameState: gameState.gameState,
                    nextGameTime: gameState.nextGameTime, // Agregar tiempo de próxima partida
                    modeName: game.modeName
                };
            }
        });
        
        res.json({
            success: true,
            stats: globalStats
        });
    } catch (error) {
        console.error('Error obteniendo estadísticas globales:', error);
        res.status(500).json({
            success: false,
            error: 'Error obteniendo estadísticas globales'
        });
    }
});

// API para forzar inicio de nueva partida por modo (solo para testing)
app.post('/api/bingo/force-start', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const { mode = 'CLASSIC' } = req.body;
        const game = globalBingoManager.getGame(mode);
        
        if (!game) {
            return res.status(404).json({
                success: false,
                error: 'Modo de juego no encontrado'
            });
        }
        
        if (game.gameState === 'waiting') {
            game.startNewGame();
            res.json({
                success: true,
                message: `Nueva partida forzada en ${mode}`,
                gameState: game.getGameState(),
                mode: mode
            });
        } else {
            res.json({
                success: false,
                message: 'No se puede forzar inicio, juego en curso',
                gameState: game.getGameState(),
                mode: mode
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

// API para reset completo de todos los cartones del usuario
app.post('/api/bingo/reset-all-cards', rateLimitMiddleware(bingoApiLimiter), (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({
                success: false,
                error: 'userId es requerido'
            });
        }
        
        // 🗑️ RESETEAR CARTONES EN TODOS LOS MODOS
        const modes = ['CLASSIC', 'RAPID', 'VIP', 'NIGHT'];
        let totalReset = 0;
        
        modes.forEach(mode => {
            globalBingoManager.updatePlayerCards(mode, userId, []);
            totalReset++;
        });
        
        console.log(`🗑️ RESET COMPLETO: Cartones reseteados para usuario ${userId} en ${totalReset} modos`);
        
        res.json({
            success: true,
            message: `Reset completo: Cartones reseteados a 0 en todos los modos`,
            totalModesReset: totalReset,
            cardsCount: 0
        });
    } catch (error) {
        console.error('Error en reset completo de cartones:', error);
        res.status(500).json({
            success: false,
            error: 'Error en reset completo de cartones'
        });
    }
});

// API de Auditoría de Seguridad
app.post('/api/audit-log', rateLimitMiddleware(apiLimiter), (req, res) => {
    try {
        const auditData = req.body;
        const auditToken = req.headers['x-audit-token'];
        
        // Validar token de auditoría básico
        if (!auditToken) {
            return res.status(401).json({
                success: false,
                error: 'Token de auditoría requerido'
            });
        }
        
        // Log de auditoría (en producción esto se enviaría a un sistema de logs)
        console.log('🔒 Log de Auditoría:', {
            timestamp: new Date().toISOString(),
            type: auditData.type || 'security',
            message: auditData.message || 'Evento de seguridad',
            sessionId: auditData.sessionId,
            userAgent: auditData.userAgent,
            ip: req.ip || req.connection.remoteAddress,
            severity: auditData.severity || 'info'
        });
        
        res.json({
            success: true,
            message: 'Log de auditoría registrado',
            timestamp: new Date().toISOString()
        });
        
    } catch (error) {
        console.error('Error en audit-log:', error);
        res.status(500).json({
            success: false,
            error: 'Error procesando log de auditoría'
        });
    }
});

// Ruta para la página de verificación
app.get('/verify', (req, res) => {
    try {
        // Obtener parámetros de la URL
        const { code, email } = req.query;
        
        console.log(`🔍 Página de verificación solicitada - Código: ${code}, Email: ${email}`);
        
        // Servir la página de verificación
        res.sendFile(path.join(__dirname, 'verification.html'));
        
    } catch (error) {
        console.error('❌ Error sirviendo página de verificación:', error);
        res.status(500).send('Error cargando página de verificación');
    }
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal!' });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log('🚀 Servidor BingoRoyal iniciado');
    console.log(`🌐 URL Local: http://localhost:${PORT}`);
    console.log(`🎯 URL Principal: https://game.bingoroyal.es`);
    console.log(`🔒 URL ALB: https://spainbingo-alb-581291766.eu-west-1.elb.amazonaws.com`);
    console.log(`📊 Modo: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔐 HTTPS: ${process.env.NODE_ENV === 'production' ? 'Habilitado' : 'Desarrollo'}`);
    console.log('🎮 Dominio único: game.bingoroyal.es');
    console.log('✅ Servidor listo para recibir conexiones');
});

module.exports = app;