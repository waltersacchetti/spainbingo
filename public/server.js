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
            fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com", "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
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
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty()
], async (req, res) => {
    console.log('🚀 ENDPOINT LOGIN EJECUTÁNDOSE');
    try {
        console.log('🔐 ===== INICIO DE LOGIN =====');
        console.log('📝 Datos recibidos:', req.body);
        
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            console.log('❌ Errores de validación:', errors.array());
            return res.status(400).json({ 
                error: 'Email y contraseña son requeridos' 
            });
        }

        const { email, password } = req.body;

        console.log('🔐 Intento de login para email:', email);

        // Verificar conexión a base de datos
        let dbConnected = false;
        try {
            await sequelize.authenticate();
            dbConnected = true;
            console.log('✅ Conexión a base de datos OK');
        } catch (dbError) {
            console.error('❌ Error de conexión a base de datos:', dbError);
            console.log('🔄 Usando sistema de autenticación temporal...');
        }

        let user = null;
        
        if (dbConnected) {
            // Buscar usuario por email en base de datos
            console.log('🔍 Buscando usuario en base de datos...');
            user = await User.findOne({
                where: { email: email }
            });

            if (user) {
                console.log('✅ Usuario encontrado en BD:', user.email);
                
                // Verificar contraseña
                console.log('🔐 Verificando contraseña...');
                const isValidPassword = await user.verifyPassword(password);
                if (!isValidPassword) {
                    console.log('❌ Contraseña inválida');
                    return res.status(401).json({ 
                        error: 'Credenciales inválidas' 
                    });
                }
                console.log('✅ Contraseña válida');
            }
        }

        // Si no hay usuario en BD o BD no está disponible, usar sistema temporal
        if (!user) {
            console.log('🔄 Usando autenticación temporal...');
            
            // Usuarios temporales para desarrollo
            const tempUsers = {
                'waltersacchetti@gmail.com': { password: 'Test123!', name: 'Walter Sacchetti' },
                'admin@spainbingo.es': { password: 'Admin123!', name: 'Administrador' },
                'test@test.com': { password: 'Test123!', name: 'Usuario Test' }
            };
            
            const tempUser = tempUsers[email];
            if (!tempUser || tempUser.password !== password) {
                console.log('❌ Credenciales temporales inválidas');
                return res.status(401).json({ 
                    error: 'Credenciales inválidas' 
                });
            }
            
            console.log('✅ Usuario temporal autenticado:', email);
            
            // Crear objeto de usuario temporal
            user = {
                id: 'temp_' + Date.now(),
                email: email,
                username: email.split('@')[0],
                name: tempUser.name,
                first_name: tempUser.name.split(' ')[0],
                last_name: tempUser.name.split(' ').slice(1).join(' '),
                is_active: true,
                balance: 100.00,
                level: 1,
                getPublicInfo: function() {
                    return {
                        id: this.id,
                        email: this.email,
                        username: this.username,
                        name: this.name,
                        first_name: this.first_name,
                        last_name: this.last_name,
                        balance: this.balance,
                        level: this.level
                    };
                }
            };
        }

        // Verificar si el usuario está activo
        if (!user.is_active) {
            return res.status(403).json({ 
                error: 'Cuenta desactivada' 
            });
        }

        console.log('✅ Usuario activo');
        
        // Actualizar último login (solo si está en BD)
        if (dbConnected && user.id && !user.id.startsWith('temp_')) {
            await user.update({ last_login: new Date() });
            console.log('✅ Último login actualizado');
        }

        // Generar token JWT
        const token = jwt.sign(
            { userId: user.id, username: user.username || user.email.split('@')[0] },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        console.log('✅ Token JWT generado');

        const response = {
            success: true,
            message: 'Login exitoso',
            user: user.getPublicInfo(),
            token
        };
        
        console.log('🔐 ===== LOGIN EXITOSO =====');
        console.log('📤 Enviando respuesta:', { ...response, token: '[HIDDEN]' });
        
        console.log('📤 Enviando respuesta final...');
        res.json(response);
        console.log('✅ Respuesta enviada');

    } catch (error) {
        console.error('❌ Error en login:', error);
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

// Endpoint de prueba simple
app.get('/api/test-simple', (req, res) => {
    console.log('🧪 Endpoint de prueba simple ejecutándose');
    res.json({ 
        message: 'Endpoint de prueba funcionando',
        timestamp: new Date().toISOString()
    });
});

// Endpoint de prueba para base de datos
app.get('/api/test-db', async (req, res) => {
    try {
        console.log('🔍 ===== PRUEBA DE BASE DE DATOS =====');
        
        // Verificar conexión
        const dbConnected = await testConnection();
        console.log('📡 Conexión a BD:', dbConnected ? 'OK' : 'ERROR');
        
        if (!dbConnected) {
            return res.status(500).json({
                error: 'No se puede conectar a la base de datos'
            });
        }
        
        // Verificar modelo User
        console.log('🔍 Verificando modelo User...');
        const userCount = await User.count();
        console.log('👥 Número de usuarios en BD:', userCount);
        
        // Intentar crear un usuario de prueba
        console.log('🔍 Intentando crear usuario de prueba...');
        const testUser = await User.create({
            username: 'test_user_' + Date.now(),
            email: 'test_' + Date.now() + '@test.com',
            password_hash: 'test123',
            first_name: 'Test',
            last_name: 'User',
            is_verified: false,
            is_active: true
        });
        console.log('✅ Usuario de prueba creado:', testUser.id);
        
        // Eliminar usuario de prueba
        await testUser.destroy();
        console.log('🗑️ Usuario de prueba eliminado');
        
        res.json({
            success: true,
            message: 'Base de datos funcionando correctamente',
            userCount: userCount,
            testUserCreated: true
        });
        
    } catch (error) {
        console.error('❌ Error en prueba de BD:', error);
        res.status(500).json({
            error: 'Error en base de datos',
            details: error.message
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
