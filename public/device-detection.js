/* ===== SISTEMA DE DETECCIÓN DE DISPOSITIVOS BINGOROYAL ===== */

class DeviceDetector {
    constructor() {
        this.device = null;
        this.orientation = null;
        this.capabilities = {};
        this.init();
    }

    init() {
        this.detectDevice();
        this.detectCapabilities();
        this.setupEventListeners();
        this.applyDeviceOptimizations();
        
        console.log('🔍 Dispositivo detectado:', this.device);
        console.log('📊 Capabilities:', this.capabilities);
    }

    // ===== DETECCIÓN PRINCIPAL =====
    detectDevice() {
        const userAgent = navigator.userAgent;
        const screenWidth = window.innerWidth;
        const screenHeight = window.innerHeight;
        const touchSupport = 'ontouchstart' in window;
        
        // Detección por User Agent
        const mobilePatterns = [
            /Android/i,
            /webOS/i,
            /iPhone/i,
            /iPad/i,
            /iPod/i,
            /BlackBerry/i,
            /Windows Phone/i,
            /Mobile/i
        ];
        
        const tabletPatterns = [
            /iPad/i,
            /Android(?=.*Tablet)|(?=.*Tab)/i,
            /Tablet/i
        ];
        
        const isMobileUA = mobilePatterns.some(pattern => pattern.test(userAgent));
        const isTabletUA = tabletPatterns.some(pattern => pattern.test(userAgent));
        
        // Detección por características de pantalla
        const isMobileScreen = screenWidth <= 768;
        const isTabletScreen = screenWidth > 768 && screenWidth <= 1024;
        const isDesktopScreen = screenWidth > 1024;
        
        // Detección híbrida más precisa
        if (userAgent.includes('iPhone') || userAgent.includes('iPod')) {
            this.device = {
                type: 'mobile',
                os: 'ios',
                category: 'smartphone'
            };
        } else if (userAgent.includes('iPad')) {
            this.device = {
                type: 'tablet',
                os: 'ios',
                category: 'tablet'
            };
        } else if (userAgent.includes('Android')) {
            if (isTabletScreen || userAgent.includes('Tablet')) {
                this.device = {
                    type: 'tablet',
                    os: 'android',
                    category: 'tablet'
                };
            } else {
                this.device = {
                    type: 'mobile',
                    os: 'android',
                    category: 'smartphone'
                };
            }
        } else if (isMobileUA && touchSupport && isMobileScreen) {
            this.device = {
                type: 'mobile',
                os: 'unknown',
                category: 'smartphone'
            };
        } else if (touchSupport && isTabletScreen) {
            this.device = {
                type: 'tablet',
                os: 'unknown',
                category: 'tablet'
            };
        } else {
            this.device = {
                type: 'desktop',
                os: this.detectDesktopOS(),
                category: 'computer'
            };
        }
        
        // Agregar información adicional
        this.device.screenSize = {
            width: screenWidth,
            height: screenHeight,
            ratio: screenWidth / screenHeight
        };
        
        this.device.userAgent = userAgent;
        this.detectOrientation();
    }

    detectDesktopOS() {
        const userAgent = navigator.userAgent;
        if (userAgent.includes('Windows')) return 'windows';
        if (userAgent.includes('Mac')) return 'macos';
        if (userAgent.includes('Linux')) return 'linux';
        return 'unknown';
    }

    detectOrientation() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (width > height) {
            this.orientation = 'landscape';
        } else {
            this.orientation = 'portrait';
        }
        
        this.device.orientation = this.orientation;
    }

    detectCapabilities() {
        this.capabilities = {
            touch: 'ontouchstart' in window,
            vibration: 'vibrate' in navigator,
            geolocation: 'geolocation' in navigator,
            camera: 'mediaDevices' in navigator,
            orientation: 'orientation' in window || 'orientation' in screen,
            fullscreen: document.fullscreenEnabled,
            serviceWorker: 'serviceWorker' in navigator,
            localStorage: typeof(Storage) !== 'undefined',
            webgl: this.hasWebGL(),
            retina: window.devicePixelRatio > 1,
            cores: navigator.hardwareConcurrency || 1,
            memory: navigator.deviceMemory || 'unknown',
            connection: this.getConnection()
        };
    }

    hasWebGL() {
        try {
            const canvas = document.createElement('canvas');
            return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
        } catch (e) {
            return false;
        }
    }

    getConnection() {
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (connection) {
            return {
                type: connection.effectiveType || connection.type,
                downlink: connection.downlink,
                rtt: connection.rtt,
                saveData: connection.saveData
            };
        }
        return null;
    }

    // ===== APLICAR OPTIMIZACIONES =====
    applyDeviceOptimizations() {
        document.body.className = ''; // Limpiar clases existentes
        
        // Agregar clases CSS según dispositivo
        document.body.classList.add(`device-${this.device.type}`);
        document.body.classList.add(`os-${this.device.os}`);
        document.body.classList.add(`orientation-${this.orientation}`);
        
        if (this.capabilities.touch) {
            document.body.classList.add('touch-device');
        } else {
            document.body.classList.add('no-touch');
        }
        
        if (this.capabilities.retina) {
            document.body.classList.add('retina');
        }
        
        // Aplicar optimizaciones específicas
        switch (this.device.type) {
            case 'mobile':
                this.applyMobileOptimizations();
                break;
            case 'tablet':
                this.applyTabletOptimizations();
                break;
            case 'desktop':
                this.applyDesktopOptimizations();
                break;
        }
    }

    applyMobileOptimizations() {
        console.log('📱 Aplicando optimizaciones móviles...');
        
        // Mostrar elementos móviles
        const mobileElements = document.querySelectorAll('.mobile-only, .mobile-menu-toggle');
        mobileElements.forEach(el => el.style.display = 'block');
        
        // Ocultar elementos desktop
        const desktopElements = document.querySelectorAll('.desktop-only');
        desktopElements.forEach(el => el.style.display = 'none');
        
        // Cargar CSS móvil si no está cargado
        this.loadMobileCSS();
        
        // Configurar viewport dinámico
        this.setupDynamicViewport();
        
        // Optimizar performance
        if (this.capabilities.cores <= 2 || this.capabilities.memory <= 2) {
            this.enablePerformanceMode();
        }
        
        // Activar gestos swipe
        this.enableSwipeGestures();
    }

    applyTabletOptimizations() {
        console.log('📱 Aplicando optimizaciones para tablet...');
        
        document.body.classList.add('tablet-mode');
        
        // Híbrido entre móvil y desktop
        if (this.orientation === 'portrait') {
            this.applyMobileOptimizations();
        } else {
            // En landscape, más similar a desktop pero manteniendo touch
            document.body.classList.add('tablet-landscape');
        }
    }

    applyDesktopOptimizations() {
        console.log('🖥️ Aplicando optimizaciones de escritorio...');
        
        // Ocultar elementos móviles
        const mobileElements = document.querySelectorAll('.mobile-only, .mobile-menu-toggle');
        mobileElements.forEach(el => el.style.display = 'none');
        
        // Mostrar elementos desktop
        const desktopElements = document.querySelectorAll('.desktop-only');
        desktopElements.forEach(el => el.style.display = 'block');
        
        // Cargar optimizaciones desktop
        this.loadDesktopFeatures();
        
        // Habilitar tooltips y hover states
        this.enableHoverInteractions();
    }

    // ===== FUNCIONES AUXILIARES =====
    loadMobileCSS() {
        if (!document.querySelector('link[href="mobile-optimizations.css"]')) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'mobile-optimizations.css';
            document.head.appendChild(link);
        }
    }

    setupDynamicViewport() {
        // Ajustar viewport en tiempo real para iOS
        const setVH = () => {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        };
        
        setVH();
        window.addEventListener('resize', setVH);
        window.addEventListener('orientationchange', () => {
            setTimeout(setVH, 100);
        });
    }

    enablePerformanceMode() {
        console.log('⚡ Modo performance activado');
        
        // Reducir animaciones
        document.documentElement.style.setProperty('--transition-normal', '0.1s');
        document.documentElement.style.setProperty('--transition-fast', '0.05s');
        
        // Desactivar efectos costosos
        const costlyElements = document.querySelectorAll('.glow-effect, .pulse-effect');
        costlyElements.forEach(el => {
            el.style.animation = 'none';
            el.style.transition = 'none';
        });
    }

    enableSwipeGestures() {
        // Los gestos swipe ya están implementados en mobile-mobile.js
        // Aquí podríamos agregar gestos adicionales específicos
        console.log('👆 Gestos swipe habilitados');
    }

    loadDesktopFeatures() {
        // Cargar características específicas de desktop
        this.enableKeyboardShortcuts();
        this.enableContextMenus();
    }

    enableHoverInteractions() {
        // Habilitar efectos hover solo en desktop
        document.body.classList.add('hover-enabled');
    }

    enableKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Shortcuts solo para desktop
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case 'h':
                        e.preventDefault();
                        this.showHelp();
                        break;
                    case 'm':
                        e.preventDefault();
                        this.toggleMute();
                        break;
                }
            }
        });
    }

    enableContextMenus() {
        // Menús contextuales para desktop
        document.addEventListener('contextmenu', (e) => {
            if (this.device.type === 'desktop') {
                // Aquí podríamos mostrar menú contextual personalizado
                console.log('Right click detectado en desktop');
            }
        });
    }

    // ===== EVENT LISTENERS =====
    setupEventListeners() {
        window.addEventListener('resize', () => {
            this.detectOrientation();
            this.updateDeviceInfo();
        });
        
        window.addEventListener('orientationchange', () => {
            setTimeout(() => {
                this.detectOrientation();
                this.updateDeviceInfo();
            }, 100);
        });
    }

    updateDeviceInfo() {
        this.device.screenSize = {
            width: window.innerWidth,
            height: window.innerHeight,
            ratio: window.innerWidth / window.innerHeight
        };
        
        this.device.orientation = this.orientation;
        
        // Reajustar optimizaciones si es necesario
        const newType = this.shouldChangeDeviceType();
        if (newType && newType !== this.device.type) {
            console.log(`🔄 Cambiando tipo de dispositivo: ${this.device.type} → ${newType}`);
            this.device.type = newType;
            this.applyDeviceOptimizations();
        }
    }

    shouldChangeDeviceType() {
        const width = window.innerWidth;
        
        if (width <= 768 && this.device.type !== 'mobile') {
            return 'mobile';
        } else if (width > 768 && width <= 1024 && this.device.type !== 'tablet') {
            return 'tablet';
        } else if (width > 1024 && this.device.type !== 'desktop') {
            return 'desktop';
        }
        
        return null;
    }

    // ===== API PÚBLICA =====
    isMobile() {
        return this.device.type === 'mobile';
    }

    isTablet() {
        return this.device.type === 'tablet';
    }

    isDesktop() {
        return this.device.type === 'desktop';
    }

    isTouchDevice() {
        return this.capabilities.touch;
    }

    getDevice() {
        return this.device;
    }

    getCapabilities() {
        return this.capabilities;
    }

    // Método para forzar recarga de detección
    refresh() {
        this.detectDevice();
        this.detectCapabilities();
        this.applyDeviceOptimizations();
    }

    // Utilities
    showHelp() {
        alert('Atajos de teclado:\nCtrl+H: Ayuda\nCtrl+M: Silenciar');
    }

    toggleMute() {
        console.log('🔇 Toggle mute');
    }
}

// ===== INICIALIZACIÓN AUTOMÁTICA =====
let deviceDetector;

document.addEventListener('DOMContentLoaded', function() {
    deviceDetector = new DeviceDetector();
    
    // Hacer disponible globalmente
    window.deviceDetector = deviceDetector;
    
    // Agregar información al console para debugging
    console.log('🔍 DeviceDetector inicializado');
    console.table(deviceDetector.getDevice());
});

// ===== FUNCIONES GLOBALES DE CONVENIENCIA =====
window.isMobile = () => deviceDetector ? deviceDetector.isMobile() : false;
window.isTablet = () => deviceDetector ? deviceDetector.isTablet() : false;
window.isDesktop = () => deviceDetector ? deviceDetector.isDesktop() : false;
window.isTouchDevice = () => deviceDetector ? deviceDetector.isTouchDevice() : false; 