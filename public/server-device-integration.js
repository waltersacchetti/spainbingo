/* ===== INTEGRACIÓN DE DEVICE DETECTION EN SERVER.JS ===== */

// Agregar estas líneas al inicio del archivo server.js después de las importaciones existentes:

// Importar Device Router (agregar después de línea 17)
const DeviceRouter = require('./device-router');

// Crear instancia del device router (agregar después de línea 18)
const deviceRouter = new DeviceRouter();

// OPCIÓN 1: Integración automática completa
// Agregar después del middleware de redirección (alrededor de línea 50)
app.use('/device', deviceRouter.getRouter());

// OPCIÓN 2: Integración selectiva en rutas existentes
// Modificar la ruta principal existente (buscar app.get('/', ...))

/*
// Reemplazar la ruta principal existente con:
app.get('/', (req, res, next) => {
    // Detectar dispositivo
    const userAgent = req.get('User-Agent') || '';
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
    const isTablet = /iPad|Android(?=.*Tablet)/i.test(userAgent);
    
    // Redirigir según dispositivo
    if (isMobile && !isTablet) {
        // Servir versión móvil
        res.sendFile(path.join(__dirname, 'mobile-index.html'));
    } else if (isTablet) {
        // Servir versión tablet
        res.sendFile(path.join(__dirname, 'tablet-index.html'));
    } else {
        // Servir versión desktop (original)
        res.sendFile(path.join(__dirname, 'index.html'));
    }
});
*/

// OPCIÓN 3: Middleware de detección para todas las rutas
// Agregar después del middleware de redirección (línea 50)

/*
app.use((req, res, next) => {
    // Detectar dispositivo en todas las rutas
    const userAgent = req.get('User-Agent') || '';
    const screenWidth = parseInt(req.get('x-screen-width')) || 0;
    
    req.device = {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent) && screenWidth <= 768,
        isTablet: /iPad|Android(?=.*Tablet)/i.test(userAgent) || (screenWidth > 768 && screenWidth <= 1024),
        isDesktop: screenWidth > 1024 || (!(/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent))),
        userAgent: userAgent,
        screenWidth: screenWidth,
        touch: req.get('x-touch-capable') === 'true'
    };
    
    // Agregar headers para optimización
    if (req.device.isMobile) {
        res.set('X-Device-Type', 'mobile');
        res.set('Cache-Control', 'public, max-age=300'); // Cache más corto para móvil
    } else if (req.device.isTablet) {
        res.set('X-Device-Type', 'tablet');
        res.set('Cache-Control', 'public, max-age=600');
    } else {
        res.set('X-Device-Type', 'desktop');
        res.set('Cache-Control', 'public, max-age=3600'); // Cache más largo para desktop
    }
    
    next();
});
*/

// OPCIÓN 4: API endpoint para detección desde el frontend
// Agregar junto con las otras rutas API

/*
app.get('/api/device-detect', (req, res) => {
    const userAgent = req.get('User-Agent') || '';
    const acceptHeader = req.get('Accept') || '';
    
    const deviceInfo = {
        userAgent: userAgent,
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
        isTablet: /iPad|Android(?=.*Tablet)/i.test(userAgent),
        acceptsWebP: acceptHeader.includes('image/webp'),
        language: req.get('Accept-Language'),
        ip: req.ip,
        timestamp: new Date().toISOString(),
        headers: {
            'x-forwarded-for': req.get('x-forwarded-for'),
            'x-real-ip': req.get('x-real-ip'),
            'x-device-width': req.get('x-device-width'),
            'x-device-height': req.get('x-device-height')
        }
    };
    
    // Determinar tipo final
    if (deviceInfo.isMobile && !deviceInfo.isTablet) {
        deviceInfo.type = 'mobile';
    } else if (deviceInfo.isTablet) {
        deviceInfo.type = 'tablet';
    } else {
        deviceInfo.type = 'desktop';
    }
    
    res.json({
        success: true,
        device: deviceInfo,
        recommendations: getDeviceRecommendations(deviceInfo)
    });
});

function getDeviceRecommendations(device) {
    const recommendations = [];
    
    if (device.type === 'mobile') {
        recommendations.push('Activar modo móvil');
        recommendations.push('Usar menú hamburguesa');
        recommendations.push('Optimizar para touch');
    } else if (device.type === 'tablet') {
        recommendations.push('Usar layout híbrido');
        recommendations.push('Aprovechar orientación');
    } else {
        recommendations.push('Usar layout completo');
        recommendations.push('Activar hover effects');
    }
    
    return recommendations;
}
*/

// IMPLEMENTACIÓN RECOMENDADA: Enfoque híbrido
// Detectar en servidor + confirmación en cliente

// 1. Middleware básico de detección (agregar después de línea 50)
app.use((req, res, next) => {
    const userAgent = req.get('User-Agent') || '';
    
    // Detección básica por User-Agent
    const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(userAgent);
    const isTabletUA = /iPad|Android.*Tablet|Tablet/i.test(userAgent);
    
    // Información básica del dispositivo
    req.deviceHint = {
        isMobile: isMobileUA && !isTabletUA,
        isTablet: isTabletUA,
        isDesktop: !isMobileUA,
        userAgent: userAgent.substring(0, 200), // Truncar para logs
        timestamp: new Date().toISOString()
    };
    
    // Log para análisis
    console.log(`📱 Device hint: ${req.deviceHint.isMobile ? 'Mobile' : req.deviceHint.isTablet ? 'Tablet' : 'Desktop'}`);
    
    next();
});

// 2. Endpoint para confirmación del cliente
app.get('/api/device-confirm', (req, res) => {
    const clientInfo = {
        width: parseInt(req.query.width) || 0,
        height: parseInt(req.query.height) || 0,
        touch: req.query.touch === 'true',
        orientation: req.query.orientation || 'unknown'
    };
    
    // Combinar detección servidor + cliente
    const finalDevice = {
        ...req.deviceHint,
        ...clientInfo,
        type: determineDeviceType(req.deviceHint, clientInfo)
    };
    
    res.json({
        success: true,
        device: finalDevice,
        serverHint: req.deviceHint,
        clientInfo: clientInfo
    });
});

function determineDeviceType(serverHint, clientInfo) {
    const width = clientInfo.width;
    
    // Usar información del cliente si está disponible
    if (width > 0) {
        if (width <= 768) return 'mobile';
        if (width <= 1024) return 'tablet';
        return 'desktop';
    }
    
    // Fallback a detección del servidor
    if (serverHint.isMobile) return 'mobile';
    if (serverHint.isTablet) return 'tablet';
    return 'desktop';
}

// 3. Servir archivos optimizados por dispositivo
app.use('/assets', (req, res, next) => {
    const device = req.deviceHint;
    const requestedFile = req.path;
    
    // Intentar servir versión específica del dispositivo
    let devicePath;
    if (device.isMobile) {
        devicePath = path.join(__dirname, 'assets', 'mobile', requestedFile);
    } else if (device.isTablet) {
        devicePath = path.join(__dirname, 'assets', 'tablet', requestedFile);
    } else {
        devicePath = path.join(__dirname, 'assets', 'desktop', requestedFile);
    }
    
    // Verificar si existe versión específica
    if (fs.existsSync(devicePath)) {
        return res.sendFile(devicePath);
    }
    
    // Fallback a archivo original
    next();
});

// 4. Modificar ruta principal para incluir información del dispositivo
// (Reemplazar o modificar la ruta GET '/' existente)
app.get('/', (req, res) => {
    // Si es welcome, mantener lógica existente
    if (req.query.welcome === 'true') {
        return res.sendFile(path.join(__dirname, 'welcome.html'));
    }
    
    // Leer archivo index.html y agregar información del dispositivo
    fs.readFile(path.join(__dirname, 'index.html'), 'utf8', (err, html) => {
        if (err) {
            console.error('Error leyendo index.html:', err);
            return res.status(500).send('Error interno del servidor');
        }
        
        // Inyectar información del dispositivo
        const deviceScript = `
        <script>
            window.SERVER_DEVICE_HINT = ${JSON.stringify(req.deviceHint)};
            window.DEVICE_DETECTION_ENABLED = true;
        </script>
        `;
        
        // Insertar antes del cierre de head
        const modifiedHtml = html.replace('</head>', deviceScript + '</head>');
        
        res.send(modifiedHtml);
    });
});

module.exports = {
    DeviceRouter,
    // Exportar funciones auxiliares para usar en otros archivos
    determineDeviceType,
    getDeviceRecommendations
}; 