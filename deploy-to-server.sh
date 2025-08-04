#!/bin/bash

# Script para desplegar archivos al servidor EC2 (Amazon Linux)
# Uso: ./deploy-to-server.sh

set -e

# Cargar información del servidor
if [ -f ec2-info.txt ]; then
    source ec2-info.txt
else
    echo "❌ No se encontró ec2-info.txt"
    exit 1
fi

echo "🚀 Desplegando SpainBingo al servidor Amazon Linux..."

# Crear archivo de configuración del servidor
cat > server.js << 'SERVER_EOF'
const express = require('express');
const path = require('path');
const fs = require('fs');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Servir archivos estáticos
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'entrada.html'));
});

app.get('/welcome', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'welcome.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.get('/game', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// API endpoints para autenticación (simulada)
app.post('/api/login', (req, res) => {
    // Simular autenticación
    res.json({ success: true, user: req.body.username });
});

app.post('/api/register', (req, res) => {
    // Simular registro
    res.json({ success: true, user: req.body.username });
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
SERVER_EOF

# Crear package.json
cat > package.json << 'PACKAGE_EOF'
{
  "name": "spainbingo-server",
  "version": "1.0.0",
  "description": "SpainBingo - Servidor de Bingo Online",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "pm2:start": "pm2 start ecosystem.config.js",
    "pm2:restart": "pm2 restart spainbingo",
    "pm2:stop": "pm2 stop spainbingo"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
PACKAGE_EOF

# Crear directorio public y copiar archivos
mkdir -p public

# Copiar archivos HTML
cp *.html public/ 2>/dev/null || true
cp *.css public/ 2>/dev/null || true
cp *.js public/ 2>/dev/null || true

# Crear archivo de configuración de PM2
cat > ecosystem.config.js << 'ECOSYSTEM_EOF'
module.exports = {
  apps: [{
    name: 'spainbingo',
    script: 'server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
ECOSYSTEM_EOF

echo "📦 Archivos del servidor creados"
echo "🚀 Para desplegar al servidor Amazon Linux:"
echo "   scp -i $KEY_FILE -r . ec2-user@$PUBLIC_IP:/var/www/spainbingo/"
echo "   ssh -i $KEY_FILE ec2-user@$PUBLIC_IP 'cd /var/www/spainbingo && npm install && pm2 restart spainbingo'"
echo ""
echo "🔧 Comandos útiles para Amazon Linux:"
echo "   ssh -i $KEY_FILE ec2-user@$PUBLIC_IP"
echo "   sudo systemctl status spainbingo"
echo "   sudo systemctl restart spainbingo"
echo "   pm2 logs spainbingo"
