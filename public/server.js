const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware básico
app.use(express.json());
app.use(express.static('.'));

// Configurar CORS para permitir peticiones desde el navegador
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

// Endpoint de prueba
app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Servidor funcionando' });
});

// Endpoint de prueba para verificar conectividad
app.get('/api/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Servidor funcionando correctamente',
        timestamp: new Date().toISOString(),
        cors: 'configurado',
        endpoints: ['/api/login', '/api/test', '/api/health', '/api/users']
    });
});

// Endpoint para verificar usuarios en la base de datos
app.get('/api/users', async (req, res) => {
    try {
        console.log('🔍 Verificando usuarios en la base de datos...');
        
        // Como el servidor actual usa login hardcodeado, vamos a simular la verificación
        const mockUsers = [
            {
                id: 'temp_123',
                email: 'waltersacchetti@gmail.com',
                username: 'waltersacchetti',
                name: 'Walter Sacchetti',
                balance: 100,
                level: 1,
                isActive: true,
                lastLogin: new Date().toISOString(),
                createdAt: new Date().toISOString()
            }
        ];
        
        res.json({
            success: true,
            message: 'Usuarios encontrados',
            totalUsers: mockUsers.length,
            users: mockUsers,
            note: 'Usando datos simulados - Base de datos real requiere configuración SSL'
        });
        
    } catch (error) {
        console.error('Error verificando usuarios:', error);
        res.status(500).json({
            success: false,
            error: 'Error al verificar usuarios',
            details: error.message
        });
    }
});

// Endpoint de login simplificado
app.post('/api/login', (req, res) => {
    console.log('Login request received:', req.body);
    
    const { email, password } = req.body;
    
    // Login hardcodeado para usuario de prueba
    if (email === 'waltersacchetti@gmail.com' && password === 'Test123!') {
        const userData = {
            id: 'temp_123',
            email: email,
            username: 'waltersacchetti',
            name: 'Walter Sacchetti',
            balance: 100.00,
            level: 1
        };
        
        const response = {
            success: true,
            message: 'Login exitoso',
            user: userData,
            token: 'temp_token_123'
        };
        
        console.log('Sending response:', response);
        return res.json(response);
    }
    
    // Buscar usuarios verificados
    for (const [userId, user] of pendingUsers.entries()) {
        if (user.email === email && user.password === password && user.isActive === true) {
            const userData = {
                id: user.id,
                email: user.email,
                username: user.username,
                name: user.name,
                balance: user.balance,
                level: user.level
            };
            
            const response = {
                success: true,
                message: 'Login exitoso',
                user: userData,
                token: `verified_token_${Date.now()}`
            };
            
            console.log('Login exitoso para usuario verificado:', user.username);
            return res.json(response);
        }
    }
    
    return res.status(401).json({ 
        success: false,
        error: 'Credenciales inválidas' 
    });
});

// Endpoint de registro simplificado
app.post('/api/register', (req, res) => {
    const { username, email, password, firstName, lastName, dateOfBirth, phone } = req.body;
    
    console.log('📝 Registro intentado:', { username, email, firstName, lastName, dateOfBirth });
    
    // Validaciones básicas
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth) {
        return res.status(400).json({
            success: false,
            error: 'Todos los campos obligatorios deben estar completos'
        });
    }
    
    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'La contraseña debe tener al menos 8 caracteres'
        });
    }
    
    // Verificar si el email ya existe
    if (email === 'waltersacchetti@gmail.com') {
        return res.status(400).json({
            success: false,
            error: 'El email ya está registrado'
        });
    }
    
    // Simular creación de usuario
    const newUser = {
        id: `user_${Date.now()}`,
        username: username,
        email: email,
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        phone: phone || '',
        balance: 100,
        level: 1,
        isActive: true,
        createdAt: new Date().toISOString()
    };
    
    console.log('✅ Usuario creado:', newUser);
    
    res.json({
        success: true,
        message: 'Usuario registrado exitosamente',
        user: newUser,
        token: `token_${Date.now()}`
    });
});

// Almacenamiento temporal de códigos de verificación
const verificationCodes = new Map();
const pendingUsers = new Map();

// Función para generar código de verificación
function generateVerificationCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Función para enviar email (simulado)
function sendVerificationEmail(email, code) {
    console.log(`📧 Email enviado a ${email} con código: ${code}`);
    console.log(`🔑 CÓDIGO DE VERIFICACIÓN: ${code}`);
    console.log(`📧 Para desarrollo, usa este código: ${code}`);
    return true;
}

// Función para enviar SMS (simulado)
function sendVerificationSMS(phone, code) {
    console.log(`📱 SMS enviado a ${phone} con código: ${code}`);
    console.log(`🔑 CÓDIGO DE VERIFICACIÓN: ${code}`);
    console.log(`📱 Para desarrollo, usa este código: ${code}`);
    return true;
}

// Endpoint de registro con confirmación
app.post('/api/register-with-confirmation', (req, res) => {
    const { username, email, password, firstName, lastName, dateOfBirth, phone, confirmationMethod } = req.body;
    
    console.log('📝 Registro con confirmación intentado:', { username, email, firstName, lastName, confirmationMethod });
    
    // Validaciones básicas
    if (!username || !email || !password || !firstName || !lastName || !dateOfBirth || !confirmationMethod) {
        return res.status(400).json({
            success: false,
            error: 'Todos los campos obligatorios deben estar completos'
        });
    }
    
    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            error: 'La contraseña debe tener al menos 8 caracteres'
        });
    }
    
    // Verificar si el email ya existe
    if (email === 'waltersacchetti@gmail.com') {
        return res.status(400).json({
            success: false,
            error: 'El email ya está registrado'
        });
    }
    
    // Generar código de verificación
    const verificationCode = generateVerificationCode();
    const userId = `user_${Date.now()}`;
    
    // Crear usuario pendiente
    const pendingUser = {
        id: userId,
        username: username,
        email: email,
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
        dateOfBirth: dateOfBirth,
        phone: phone || '',
        password: password,
        balance: 100,
        level: 1,
        isActive: false,
        status: 'pending_verification',
        confirmationMethod: confirmationMethod,
        createdAt: new Date().toISOString()
    };
    
    // Guardar usuario pendiente y código
    pendingUsers.set(userId, pendingUser);
    verificationCodes.set(userId, {
        code: verificationCode,
        method: confirmationMethod,
        createdAt: new Date(),
        attempts: 0
    });
    
    // Enviar código de verificación
    let sent = false;
    if (confirmationMethod === 'email') {
        sent = sendVerificationEmail(email, verificationCode);
    } else if (confirmationMethod === 'sms') {
        sent = sendVerificationSMS(phone, verificationCode);
    }
    
    if (sent) {
        console.log('✅ Código de verificación enviado:', verificationCode);
        
        res.json({
            success: true,
            message: 'Usuario registrado. Verifica tu cuenta con el código enviado.',
            user: {
                id: userId,
                username: username,
                email: email,
                name: `${firstName} ${lastName}`,
                status: 'pending_verification',
                confirmationMethod: confirmationMethod
            },
            note: `Código enviado por ${confirmationMethod === 'email' ? 'email' : 'SMS'}`
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'Error al enviar código de verificación'
        });
    }
});

// Endpoint para verificar código
app.post('/api/verify-code', (req, res) => {
    const { userId, code } = req.body;
    
    console.log('🔍 Verificación de código:', { userId, code });
    
    if (!userId || !code) {
        return res.status(400).json({
            success: false,
            error: 'Usuario y código son requeridos'
        });
    }
    
    const verificationData = verificationCodes.get(userId);
    const pendingUser = pendingUsers.get(userId);
    
    if (!verificationData || !pendingUser) {
        return res.status(404).json({
            success: false,
            error: 'Usuario no encontrado o código expirado'
        });
    }
    
    // Verificar intentos
    if (verificationData.attempts >= 3) {
        return res.status(400).json({
            success: false,
            error: 'Demasiados intentos fallidos. Solicita un nuevo código.'
        });
    }
    
    // Verificar código
    if (verificationData.code === code) {
        // Activar usuario
        pendingUser.isActive = true;
        pendingUser.status = 'verified';
        pendingUser.verifiedAt = new Date().toISOString();
        
        // Limpiar datos de verificación
        verificationCodes.delete(userId);
        
        console.log('✅ Usuario verificado:', pendingUser.username);
        
        res.json({
            success: true,
            message: 'Cuenta verificada exitosamente',
            user: {
                id: pendingUser.id,
                username: pendingUser.username,
                email: pendingUser.email,
                name: pendingUser.name,
                status: 'verified',
                balance: pendingUser.balance,
                level: pendingUser.level
            },
            token: `verified_token_${Date.now()}`
        });
    } else {
        // Incrementar intentos fallidos
        verificationData.attempts++;
        
        res.status(400).json({
            success: false,
            error: `Código incorrecto. Intentos restantes: ${3 - verificationData.attempts}`
        });
    }
});

// Endpoint para reenviar código
app.post('/api/resend-code', (req, res) => {
    const { userId, method } = req.body;
    
    console.log('🔄 Reenvío de código:', { userId, method });
    
    const pendingUser = pendingUsers.get(userId);
    
    if (!pendingUser) {
        return res.status(404).json({
            success: false,
            error: 'Usuario no encontrado'
        });
    }
    
    // Generar nuevo código
    const newCode = generateVerificationCode();
    
    // Actualizar código de verificación
    verificationCodes.set(userId, {
        code: newCode,
        method: method || pendingUser.confirmationMethod,
        createdAt: new Date(),
        attempts: 0
    });
    
    // Enviar nuevo código
    let sent = false;
    if (method === 'email' || pendingUser.confirmationMethod === 'email') {
        sent = sendVerificationEmail(pendingUser.email, newCode);
    } else if (method === 'sms' || pendingUser.confirmationMethod === 'sms') {
        sent = sendVerificationSMS(pendingUser.phone, newCode);
    }
    
    if (sent) {
        console.log('✅ Nuevo código enviado:', newCode);
        
        res.json({
            success: true,
            message: 'Nuevo código de verificación enviado',
            method: method || pendingUser.confirmationMethod
        });
    } else {
        res.status(500).json({
            success: false,
            error: 'Error al reenviar código de verificación'
        });
    }
});

// Endpoint para ver códigos activos (solo para desarrollo)
app.get('/api/debug/codes', (req, res) => {
    const activeCodes = [];
    
    for (const [userId, codeData] of verificationCodes.entries()) {
        const user = pendingUsers.get(userId);
        if (user) {
            activeCodes.push({
                userId: userId,
                username: user.username,
                email: user.email,
                phone: user.phone,
                code: codeData.code,
                method: codeData.method,
                attempts: codeData.attempts,
                createdAt: codeData.createdAt,
                isActive: user.isActive
            });
        }
    }
    
    res.json({
        success: true,
        message: 'Códigos activos (solo para desarrollo)',
        codes: activeCodes,
        total: activeCodes.length
    });
});

// Endpoint de prueba completamente diferente
app.post('/api/auth', (req, res) => {
    res.json({
        success: true,
        user: {
            id: 'test_123',
            email: 'test@test.com',
            name: 'Test User'
        }
    });
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

app.get('/verification', (req, res) => {
    res.sendFile(__dirname + '/verification.html');
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
});
