const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const http = require('http');
const socketIo = require('socket.io');
const { sequelize, testConnection } = require('./config/database');
const User = require('./models/User')(sequelize);

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'spainbingo-secret-key-2024';

// Middleware de seguridad
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(compression());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    message: { error: 'Demasiadas peticiones, intenta más tarde' }
});
app.use('/api/', limiter);

// Servir archivos estáticos
app.use(express.static(path.join(__dirname)));

// Rutas de páginas
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

app.get('/test', (req, res) => {
    res.sendFile(path.join(__dirname, 'test-simple.html'));
});

// Middleware para verificar JWT
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token de acceso requerido' });
    }

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await User.findByPk(decoded.userId);
        
        if (!user || !user.is_active) {
            return res.status(401).json({ error: 'Usuario no válido' });
        }

        req.user = user;
        next();
    } catch (error) {
        return res.status(403).json({ error: 'Token inválido' });
    }
};

// API endpoints para autenticación
app.post('/api/register', [
    body('username').isLength({ min: 3, max: 50 }).matches(/^[a-zA-Z0-9_]+$/),
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/),
    body('firstName').optional().isLength({ min: 2, max: 50 }),
    body('lastName').optional().isLength({ min: 2, max: 50 }),
    body('dateOfBirth').optional().isISO8601(),
    body('phone').optional().isMobilePhone(),
    body('country').optional().isLength({ min: 2, max: 50 }),
    body('city').optional().isLength({ min: 2, max: 50 }),
    body('postalCode').optional().isLength({ min: 3, max: 10 })
], async (req, res) => {
    try {
        // Verificar errores de validación
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Datos de entrada inválidos',
                details: errors.array() 
            });
        }

        const { username, email, password, firstName, lastName, dateOfBirth, phone, country, city, postalCode } = req.body;

        // Verificar si el usuario ya existe
        const existingUser = await User.findOne({
            where: {
                [sequelize.Op.or]: [{ username }, { email }]
            }
        });

        if (existingUser) {
            return res.status(409).json({ 
                error: 'El usuario o email ya existe' 
            });
        }

        // Verificar edad mínima (18 años)
        if (dateOfBirth) {
            const birthDate = new Date(dateOfBirth);
            const today = new Date();
            const age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
                if (age - 1 < 18) {
                    return res.status(400).json({ 
                        error: 'Debes ser mayor de 18 años para registrarte' 
                    });
                }
            } else if (age < 18) {
                return res.status(400).json({ 
                    error: 'Debes ser mayor de 18 años para registrarte' 
                });
            }
        }

        // Crear usuario
        const user = await User.create({
            username,
            email,
            password_hash: password, // Se hasheará automáticamente en el modelo
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth,
            phone,
            country: country || 'Spain',
            city,
            postal_code: postalCode,
            is_verified: false,
            is_active: true
        });

        // Generar token JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.status(201).json({
            success: true,
            message: 'Usuario registrado exitosamente',
            user: user.getPublicInfo(),
            token
        });

    } catch (error) {
        console.error('Error en registro:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
});

app.post('/api/login', [
    body('username').notEmpty(),
    body('password').notEmpty()
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Usuario y contraseña son requeridos' 
            });
        }

        const { username, password } = req.body;

        // Buscar usuario por username o email
        const user = await User.findOne({
            where: {
                [sequelize.Op.or]: [
                    { username: username },
                    { email: username }
                ]
            }
        });

        if (!user) {
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Verificar contraseña
        const isValidPassword = await user.verifyPassword(password);
        if (!isValidPassword) {
            return res.status(401).json({ 
                error: 'Credenciales inválidas' 
            });
        }

        // Verificar si el usuario está activo
        if (!user.is_active) {
            return res.status(403).json({ 
                error: 'Cuenta desactivada' 
            });
        }

        // Verificar auto-exclusión
        if (user.isSelfExcluded()) {
            return res.status(403).json({ 
                error: 'Cuenta en auto-exclusión' 
            });
        }

        // Actualizar último login
        await user.update({ last_login: new Date() });

        // Generar token JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            message: 'Login exitoso',
            user: user.getPublicInfo(),
            token
        });

    } catch (error) {
        console.error('Error en login:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
});

// API para obtener perfil del usuario
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        res.json({
            success: true,
            user: req.user.getPublicInfo()
        });
    } catch (error) {
        console.error('Error obteniendo perfil:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor' 
        });
    }
});

// API para actualizar perfil
app.put('/api/user/profile', authenticateToken, [
    body('firstName').optional().isLength({ min: 2, max: 50 }),
    body('lastName').optional().isLength({ min: 2, max: 50 }),
    body('phone').optional().isMobilePhone(),
    body('city').optional().isLength({ min: 2, max: 50 }),
    body('postalCode').optional().isLength({ min: 3, max: 10 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Datos de entrada inválidos',
                details: errors.array() 
            });
        }

        const { firstName, lastName, phone, city, postalCode } = req.body;

        await req.user.update({
            first_name: firstName,
            last_name: lastName,
            phone,
            city,
            postal_code: postalCode
        });

        res.json({
            success: true,
            message: 'Perfil actualizado exitosamente',
            user: req.user.getPublicInfo()
        });

    } catch (error) {
        console.error('Error actualizando perfil:', error);
        res.status(500).json({ 
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
app.get('/health', async (req, res) => {
    try {
        // Verificar conexión a base de datos
        const dbConnected = await testConnection();
        
        res.json({ 
            status: 'OK', 
            timestamp: new Date().toISOString(),
            database: dbConnected ? 'connected' : 'disconnected'
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'ERROR', 
            timestamp: new Date().toISOString(),
            error: error.message 
        });
    }
});

// Manejo de errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Algo salió mal!' });
});

// Socket.IO para chat en tiempo real
io.on('connection', (socket) => {
    console.log('Usuario conectado:', socket.id);

    socket.on('join-game', (data) => {
        socket.join('bingo-room');
        socket.to('bingo-room').emit('user-joined', { 
            username: data.username,
            message: `${data.username} se unió al juego`
        });
    });

    socket.on('chat-message', (data) => {
        socket.to('bingo-room').emit('chat-message', {
            username: data.username,
            message: data.message,
            timestamp: new Date().toISOString()
        });
    });

    socket.on('disconnect', () => {
        console.log('Usuario desconectado:', socket.id);
    });
});

// Inicializar base de datos y servidor
async function startServer() {
    try {
        // Probar conexión a base de datos
        const dbConnected = await testConnection();
        if (!dbConnected) {
            console.error('❌ No se pudo conectar a la base de datos');
            process.exit(1);
        }

        console.log('✅ Conexión a base de datos establecida');

        // Iniciar servidor
        server.listen(PORT, () => {
            console.log(`🚀 SpainBingo servidor ejecutándose en puerto ${PORT}`);
            console.log(`🌐 URL: http://localhost:${PORT}`);
            console.log(`🗄️ Base de datos: ${dbConnected ? 'Conectada' : 'Desconectada'}`);
        });

    } catch (error) {
        console.error('❌ Error iniciando servidor:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app;
