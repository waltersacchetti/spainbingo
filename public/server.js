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
        endpoints: ['/api/login', '/api/test', '/api/health']
    });
});

// Endpoint de login simplificado
app.post('/api/login', (req, res) => {
    console.log('Login request received:', req.body);
    
    const { email, password } = req.body;
    
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
    } else {
        return res.status(401).json({ error: 'Credenciales inválidas' });
    }
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

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor iniciado en puerto ${PORT}`);
});
