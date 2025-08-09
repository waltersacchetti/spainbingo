/* ===== ROUTER DE DISPOSITIVOS PARA SERVIDOR BINGOROYAL ===== */

const express = require('express');
const path = require('path');

class DeviceRouter {
    constructor() {
        this.router = express.Router();
        this.setupRoutes();
    }

    // Detectar dispositivo por User-Agent y headers
    detectDevice(req) {
        const userAgent = req.get('User-Agent') || '';
        const acceptHeader = req.get('Accept') || '';
        
        // Patrones de detección
        const mobilePatterns = [
            /Android/i,
            /webOS/i,
            /iPhone/i,
            /iPod/i,
            /BlackBerry/i,
            /Windows Phone/i,
            /Opera Mini/i,
            /Mobile/i
        ];
        
        const tabletPatterns = [
            /iPad/i,
            /Android(?=.*Tablet)/i,
            /Tablet/i
        ];
        
        // Detección básica
        const isMobile = mobilePatterns.some(pattern => pattern.test(userAgent));
        const isTablet = tabletPatterns.some(pattern => pattern.test(userAgent));
        
        // Información adicional del device
        const deviceInfo = {
            userAgent,
            isMobile: isMobile && !isTablet,
            isTablet,
            isDesktop: !isMobile && !isTablet,
            acceptsWebP: acceptHeader.includes('image/webp'),
            acceptsAVIF: acceptHeader.includes('image/avif'),
            language: req.get('Accept-Language'),
            ip: req.ip || req.connection.remoteAddress,
            timestamp: new Date().toISOString()
        };
        
        return deviceInfo;
    }

    // Configurar rutas según dispositivo
    setupRoutes() {
        
        // Middleware de detección
        this.router.use((req, res, next) => {
            req.device = this.detectDevice(req);
            
            // Log para debugging
            console.log(`📱 Dispositivo detectado: ${req.device.isMobile ? 'Móvil' : req.device.isTablet ? 'Tablet' : 'Desktop'}`);
            console.log(`🌐 User-Agent: ${req.device.userAgent.substring(0, 50)}...`);
            
            next();
        });

        // Ruta principal con redirección por dispositivo
        this.router.get('/', (req, res) => {
            if (req.device.isMobile) {
                this.serveMobilePage(req, res);
            } else if (req.device.isTablet) {
                this.serveTabletPage(req, res);
            } else {
                this.serveDesktopPage(req, res);
            }
        });

        // Ruta específica para móvil
        this.router.get('/mobile', (req, res) => {
            this.serveMobilePage(req, res);
        });

        // Ruta específica para tablet
        this.router.get('/tablet', (req, res) => {
            this.serveTabletPage(req, res);
        });

        // Ruta específica para desktop
        this.router.get('/desktop', (req, res) => {
            this.serveDesktopPage(req, res);
        });

        // API para obtener información del dispositivo
        this.router.get('/api/device-info', (req, res) => {
            res.json({
                success: true,
                device: req.device,
                recommendations: this.getOptimizationRecommendations(req.device)
            });
        });

        // Servir assets optimizados por dispositivo
        this.router.get('/assets/*', (req, res) => {
            this.serveOptimizedAssets(req, res);
        });
    }

    // Servir página optimizada para móvil
    serveMobilePage(req, res) {
        const mobileHTML = this.generateMobileHTML(req.device);
        res.send(mobileHTML);
    }

    // Servir página optimizada para tablet
    serveTabletPage(req, res) {
        const tabletHTML = this.generateTabletHTML(req.device);
        res.send(tabletHTML);
    }

    // Servir página optimizada para desktop
    serveDesktopPage(req, res) {
        const desktopHTML = this.generateDesktopHTML(req.device);
        res.send(desktopHTML);
    }

    // Generar HTML optimizado para móvil
    generateMobileHTML(device) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
            <meta name="mobile-web-app-capable" content="yes">
            <meta name="apple-mobile-web-app-capable" content="yes">
            <title>BingoRoyal - Móvil</title>
            
            <!-- CSS específico móvil -->
            <link rel="stylesheet" href="styles-codere.css">
            <link rel="stylesheet" href="mobile-optimizations.css">
            <link rel="stylesheet" href="adaptive-styles.css">
            
            <!-- JavaScript optimizado para móvil -->
            <script>
                window.DEVICE_TYPE = 'mobile';
                window.DEVICE_INFO = ${JSON.stringify(device)};
            </script>
        </head>
        <body class="device-mobile">
            <div class="mobile-app-container">
                ${this.getMobileHeader()}
                ${this.getMobileNavigation()}
                ${this.getMobileContent()}
                ${this.getMobileFooter()}
            </div>
            
            <!-- Scripts móviles -->
            <script src="device-detection.js"></script>
            <script src="mobile-mobile.js"></script>
            <script src="script.js"></script>
        </body>
        </html>
        `;
    }

    // Generar HTML optimizado para tablet
    generateTabletHTML(device) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BingoRoyal - Tablet</title>
            
            <!-- CSS híbrido tablet -->
            <link rel="stylesheet" href="styles-codere.css">
            <link rel="stylesheet" href="mobile-optimizations.css">
            <link rel="stylesheet" href="adaptive-styles.css">
            
            <script>
                window.DEVICE_TYPE = 'tablet';
                window.DEVICE_INFO = ${JSON.stringify(device)};
            </script>
        </head>
        <body class="device-tablet">
            <div class="tablet-app-container">
                ${this.getTabletHeader()}
                ${this.getTabletContent()}
                ${this.getTabletSidebar()}
            </div>
            
            <script src="device-detection.js"></script>
            <script src="mobile-mobile.js"></script>
            <script src="script.js"></script>
        </body>
        </html>
        `;
    }

    // Generar HTML optimizado para desktop
    generateDesktopHTML(device) {
        return `
        <!DOCTYPE html>
        <html lang="es">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>BingoRoyal - Escritorio</title>
            
            <!-- CSS completo desktop -->
            <link rel="stylesheet" href="styles-codere.css">
            <link rel="stylesheet" href="adaptive-styles.css">
            
            <script>
                window.DEVICE_TYPE = 'desktop';
                window.DEVICE_INFO = ${JSON.stringify(device)};
            </script>
        </head>
        <body class="device-desktop">
            <div class="desktop-app-container">
                ${this.getDesktopHeader()}
                ${this.getDesktopLayout()}
                ${this.getDesktopSidebars()}
            </div>
            
            <script src="device-detection.js"></script>
            <script src="script.js"></script>
        </body>
        </html>
        `;
    }

    // Componentes específicos por dispositivo
    getMobileHeader() {
        return `
        <header class="mobile-header">
            <button class="mobile-menu-toggle" id="mobileMenuToggle">
                <i class="fas fa-bars"></i>
            </button>
            <div class="mobile-logo">
                <i class="fas fa-dice"></i>
                <span>BingoRoyal</span>
            </div>
            <div class="mobile-user-info">
                <span id="mobileBalance">€0.00</span>
            </div>
        </header>
        `;
    }

    getMobileNavigation() {
        return `
        <nav class="mobile-navigation">
            <div class="mobile-tabs">
                <button class="mobile-tab active" data-section="game">🎯 Juego</button>
                <button class="mobile-tab" data-section="cards">🎫 Cartones</button>
                <button class="mobile-tab" data-section="shop">🛒 Tienda</button>
                <button class="mobile-tab" data-section="profile">👤 Perfil</button>
            </div>
        </nav>
        `;
    }

    getMobileContent() {
        return `
        <main class="mobile-content">
            <div class="mobile-game-area">
                <!-- Contenido del juego optimizado para móvil -->
                <div class="mobile-bingo-cards"></div>
                <div class="mobile-called-numbers"></div>
                <div class="mobile-game-controls"></div>
            </div>
        </main>
        `;
    }

    getMobileFooter() {
        return `
        <footer class="mobile-footer">
            <div class="mobile-quick-actions">
                <button class="quick-action" data-action="buy">🛒 Comprar</button>
                <button class="quick-action" data-action="bingo">🎯 ¡BINGO!</button>
                <button class="quick-action" data-action="chat">💬 Chat</button>
            </div>
        </footer>
        `;
    }

    getTabletHeader() {
        return `
        <header class="tablet-header">
            <div class="tablet-header-content">
                <div class="tablet-logo">
                    <i class="fas fa-dice"></i>
                    <span>BingoRoyal</span>
                </div>
                <nav class="tablet-nav">
                    <button class="tablet-nav-item active">🎯 Juego</button>
                    <button class="tablet-nav-item">🎫 Cartones</button>
                    <button class="tablet-nav-item">🛒 Tienda</button>
                    <button class="tablet-nav-item">👤 Perfil</button>
                </nav>
                <div class="tablet-user-info">
                    <span>👤 Usuario</span>
                    <span>💰 €125.50</span>
                </div>
            </div>
        </header>
        `;
    }

    getTabletContent() {
        return `
        <main class="tablet-content">
            <div class="tablet-game-layout">
                <div class="tablet-main-area">
                    <!-- Área principal del juego -->
                </div>
                <div class="tablet-side-info">
                    <!-- Información lateral -->
                </div>
            </div>
        </main>
        `;
    }

    getTabletSidebar() {
        return `
        <aside class="tablet-sidebar">
            <div class="tablet-stats">
                <!-- Estadísticas -->
            </div>
            <div class="tablet-chat">
                <!-- Chat compacto -->
            </div>
        </aside>
        `;
    }

    getDesktopHeader() {
        return `
        <header class="desktop-header">
            <div class="desktop-header-content">
                <div class="desktop-logo">
                    <i class="fas fa-dice"></i>
                    <span>BingoRoyal</span>
                </div>
                <nav class="desktop-nav">
                    <a href="#game" class="desktop-nav-item active">🎯 Juego</a>
                    <a href="#cards" class="desktop-nav-item">🎫 Mis Cartones</a>
                    <a href="#shop" class="desktop-nav-item">🛒 Tienda</a>
                    <a href="#tournaments" class="desktop-nav-item">🏆 Torneos</a>
                    <a href="#profile" class="desktop-nav-item">👤 Perfil</a>
                </nav>
                <div class="desktop-user-section">
                    <div class="desktop-user-info">
                        <span>👤 Usuario Premium</span>
                        <span>💰 €125.50</span>
                        <span>⭐ Nivel 15</span>
                    </div>
                    <div class="desktop-actions">
                        <button class="desktop-btn">🔔</button>
                        <button class="desktop-btn">⚙️</button>
                        <button class="desktop-btn">🚪</button>
                    </div>
                </div>
            </div>
        </header>
        `;
    }

    getDesktopLayout() {
        return `
        <main class="desktop-layout">
            <aside class="desktop-left-sidebar">
                <!-- Sidebar izquierdo con estadísticas -->
            </aside>
            <div class="desktop-main-content">
                <!-- Contenido principal del juego -->
            </div>
            <aside class="desktop-right-sidebar">
                <!-- Sidebar derecho con chat y info -->
            </aside>
        </main>
        `;
    }

    getDesktopSidebars() {
        return `
        <!-- Chat flotante para desktop -->
        <div class="desktop-chat-float">
            <button class="desktop-chat-toggle">💬 Chat</button>
        </div>
        `;
    }

    // Servir assets optimizados según dispositivo
    serveOptimizedAssets(req, res) {
        const filePath = req.params[0];
        const device = req.device;
        
        // Determinar versión del asset según dispositivo
        let assetPath;
        if (device.isMobile) {
            assetPath = path.join(__dirname, 'assets', 'mobile', filePath);
        } else if (device.isTablet) {
            assetPath = path.join(__dirname, 'assets', 'tablet', filePath);
        } else {
            assetPath = path.join(__dirname, 'assets', 'desktop', filePath);
        }
        
        // Fallback al asset original si no existe versión específica
        if (!require('fs').existsSync(assetPath)) {
            assetPath = path.join(__dirname, 'assets', filePath);
        }
        
        res.sendFile(assetPath);
    }

    // Recomendaciones de optimización según dispositivo
    getOptimizationRecommendations(device) {
        const recommendations = [];
        
        if (device.isMobile) {
            recommendations.push('Usar interfaz simplificada');
            recommendations.push('Activar gestos táctiles');
            recommendations.push('Reducir animaciones complejas');
            recommendations.push('Usar menú hamburguesa');
        }
        
        if (device.isTablet) {
            recommendations.push('Layout híbrido móvil/desktop');
            recommendations.push('Aprovechar orientación landscape');
            recommendations.push('Navegación por pestañas');
        }
        
        if (device.isDesktop) {
            recommendations.push('Usar layout completo con sidebars');
            recommendations.push('Habilitar hover effects');
            recommendations.push('Activar atajos de teclado');
            recommendations.push('Chat lateral flotante');
        }
        
        return recommendations;
    }

    // Obtener el router configurado
    getRouter() {
        return this.router;
    }
}

module.exports = DeviceRouter; 