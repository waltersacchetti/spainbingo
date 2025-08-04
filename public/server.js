const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'spainbingo-dev-secret-2024';

// Middleware básico
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://cdnjs.cloudflare.com"]
        }
    }
}));
app.use(compression());
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // máximo 100 requests por ventana
});
app.use('/api/', limiter);

// Endpoint de prueba simple
app.get('/api/test-simple', (req, res) => {
    console.log('🧪 Endpoint de prueba simple ejecutándose');
    res.json({ 
        success: true,
        message: 'Endpoint de prueba funcionando',
        timestamp: new Date().toISOString()
    });
});

// Endpoint de login simplificado
app.post('/api/login', (req, res) => {
    console.log('🚀 ENDPOINT LOGIN EJECUTÁNDOSE');
    console.log('📝 Datos recibidos:', req.body);
    
    const { email, password } = req.body;
    
    // Sistema de autenticación temporal
    const tempUsers = {
        'waltersacchetti@gmail.com': { password: 'Test123!', name: 'Walter Sacchetti' },
        'admin@spainbingo.es': { password: 'Admin123!', name: 'Administrador' },
        'test@test.com': { password: 'Test123!', name: 'Usuario Test' }
    };
    
    const tempUser = tempUsers[email];
    if (!tempUser || tempUser.password !== password) {
        console.log('❌ Credenciales inválidas');
        return res.status(401).json({ 
            error: 'Credenciales inválidas' 
        });
    }
    
    console.log('✅ Usuario autenticado:', email);
    
    // Crear objeto de usuario
    const userInfo = {
        id: 'temp_' + Date.now(),
        email: email,
        username: email.split('@')[0],
        name: tempUser.name,
        first_name: tempUser.name.split(' ')[0],
        last_name: tempUser.name.split(' ').slice(1).join(' '),
        balance: 100.00,
        level: 1
    };
    
    // Generar token JWT
    const token = jwt.sign(
        { userId: userInfo.id, username: userInfo.username },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    const response = {
        success: true,
        message: 'Login exitoso',
        user: userInfo,
        token: token
    };
    
    console.log('🔐 ===== LOGIN EXITOSO =====');
    console.log('📤 Enviando respuesta:', { ...response, token: '[HIDDEN]' });
    console.log('👤 Datos del usuario:', response.user);
    
    res.json(response);
    console.log('✅ Respuesta enviada');
});

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/welcome.html');
});

app.get('/game', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

app.get('/login', (req, res) => {
    res.sendFile(__dirname + '/login.html');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor SpainBingo iniciado en puerto ${PORT}`);
    console.log(`📁 Directorio de trabajo: ${__dirname}`);
    console.log(`🌐 URLs disponibles:`);
    console.log(`   - Página principal: http://localhost:${PORT}`);
    console.log(`   - Juego: http://localhost:${PORT}/game`);
    console.log(`   - Login: http://localhost:${PORT}/login`);
    console.log(`   - API Test: http://localhost:${PORT}/api/test-simple`);
});
