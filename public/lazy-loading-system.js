/* ===== BINGO ROYAL - SISTEMA DE LAZY LOADING ===== */
/* Sistema inteligente de carga diferida para mejorar el rendimiento */

class LazyLoadingSystem {
    constructor() {
        this.observers = new Map();
        this.loadedElements = new Set();
        this.loadingQueue = [];
        this.isInitialized = false;
        this.progress = 0;
        this.maxProgress = 100;
        
        this.init();
    }
    
    init() {
        if (this.isInitialized) return;
        
        console.log('🚀 Iniciando sistema de lazy loading...');
        
        // Configurar Intersection Observer para elementos lazy
        this.setupIntersectionObserver();
        
        // Configurar preloader inteligente
        this.setupSmartPreloader();
        
        // Inicializar carga diferida
        this.initializeLazyLoading();
        
        this.isInitialized = true;
        console.log('✅ Sistema de lazy loading inicializado');
    }
    
    setupIntersectionObserver() {
        // Observer para elementos que entran en viewport
        this.observers.set('viewport', new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadElement(entry.target);
                    }
                });
            },
            {
                rootMargin: '50px',
                threshold: 0.1
            }
        ));
        
        // Observer para elementos críticos
        this.observers.set('critical', new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        this.loadCriticalElement(entry.target);
                    }
                });
            },
            {
                rootMargin: '100px',
                threshold: 0.5
            }
        ));
    }
    
    setupSmartPreloader() {
        // Crear preloader inteligente
        const preloader = document.createElement('div');
        preloader.className = 'smart-preloader';
        preloader.innerHTML = `
            <div class="preloader-content">
                <div class="preloader-progress">
                    <div class="progress-bar" id="progressBar"></div>
                </div>
                <div class="progress-text" id="progressText">Cargando BingoRoyal...</div>
            </div>
        `;
        
        document.body.appendChild(preloader);
        this.preloader = preloader;
        this.progressBar = document.getElementById('progressBar');
        this.progressText = document.getElementById('progressText');
        
        // Simular progreso de carga
        this.simulateLoadingProgress();
    }
    
    simulateLoadingProgress() {
        const steps = [
            { progress: 20, text: 'Inicializando juego...' },
            { progress: 40, text: 'Cargando cartones...' },
            { progress: 60, text: 'Preparando interfaz...' },
            { progress: 80, text: 'Configurando modos...' },
            { progress: 100, text: '¡Listo para jugar!' }
        ];
        
        let currentStep = 0;
        const interval = setInterval(() => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                this.updateProgress(step.progress, step.text);
                currentStep++;
            } else {
                clearInterval(interval);
                this.hidePreloader();
            }
        }, 800);
    }
    
    updateProgress(progress, text) {
        this.progress = progress;
        if (this.progressBar) {
            this.progressBar.style.width = `${progress}%`;
        }
        if (this.progressText) {
            this.progressText.textContent = text;
        }
    }
    
    hidePreloader() {
        if (this.preloader) {
            this.preloader.classList.add('hidden');
            setTimeout(() => {
                this.preloader.classList.add('removed');
            }, 500);
        }
    }
    
    initializeLazyLoading() {
        // Marcar elementos para lazy loading
        this.markLazyElements();
        
        // Cargar elementos críticos inmediatamente
        this.loadCriticalElements();
        
        // Programar carga de elementos no críticos
        this.scheduleNonCriticalLoading();
    }
    
    markLazyElements() {
        // Elementos que se cargan cuando entran en viewport
        const lazyElements = document.querySelectorAll('[data-lazy="true"]');
        lazyElements.forEach(element => {
            element.classList.add('lazy-element');
            this.observers.get('viewport').observe(element);
        });
        
        // Elementos críticos que se cargan antes
        const criticalElements = document.querySelectorAll('[data-critical="true"]');
        criticalElements.forEach(element => {
            element.classList.add('lazy-element', 'critical');
            this.observers.get('critical').observe(element);
        });
    }
    
    loadCriticalElements() {
        const criticalElements = document.querySelectorAll('[data-critical="true"]');
        criticalElements.forEach(element => {
            this.loadElement(element, true);
        });
    }
    
    scheduleNonCriticalLoading() {
        // Cargar elementos no críticos después de un delay
        setTimeout(() => {
            const nonCriticalElements = document.querySelectorAll('[data-lazy="true"]:not(.loaded)');
            nonCriticalElements.forEach((element, index) => {
                setTimeout(() => {
                    this.loadElement(element);
                }, index * 100); // Carga escalonada
            });
        }, 1000);
    }
    
    loadElement(element, isCritical = false) {
        if (this.loadedElements.has(element)) return;
        
        const priority = isCritical ? 'priority' : 'normal';
        element.classList.add('loading', `intelligent-loading-${priority}`);
        
        // Simular tiempo de carga
        const loadTime = isCritical ? 100 : 300 + Math.random() * 200;
        
        setTimeout(() => {
            element.classList.remove('loading');
            element.classList.add('loaded', 'visible');
            this.loadedElements.add(element);
            
            // Actualizar progreso
            this.updateProgress(
                Math.min(100, (this.loadedElements.size / 20) * 100),
                `Elemento cargado (${this.loadedElements.size})`
            );
            
            console.log(`✅ Elemento cargado: ${element.tagName}${element.className ? '.' + element.className.split(' ')[0] : ''}`);
        }, loadTime);
    }
    
    loadCriticalElement(element) {
        this.loadElement(element, true);
    }
    
    // Cargar contenido diferido
    loadDeferredContent(container, content, delay = 0) {
        if (!container) return;
        
        container.classList.add('deferred-content', 'loading');
        
        setTimeout(() => {
            container.innerHTML = content;
            container.classList.remove('loading');
            container.classList.add('loaded');
        }, delay);
    }
    
    // Cargar imagen lazy
    loadLazyImage(imgElement, src) {
        if (!imgElement || !src) return;
        
        imgElement.classList.add('lazy-image');
        
        const image = new Image();
        image.onload = () => {
            imgElement.src = src;
            imgElement.classList.add('loaded');
        };
        image.onerror = () => {
            imgElement.classList.add('error');
        };
        image.src = src;
    }
    
    // Cargar script diferido
    loadDeferredScript(src, callback) {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        
        if (callback) {
            script.onload = callback;
        }
        
        document.head.appendChild(script);
    }
    
    // Cargar CSS diferido
    loadDeferredCSS(href) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
    }
    
    // Optimizar rendimiento
    optimizePerformance() {
        // Reducir repaints
        document.body.style.willChange = 'auto';
        
        // Optimizar scroll
        if ('scrollBehavior' in document.documentElement.style) {
            document.documentElement.style.scrollBehavior = 'auto';
        }
        
        // Limpiar observers no utilizados
        this.cleanupObservers();
        
        console.log('⚡ Rendimiento optimizado');
    }
    
    cleanupObservers() {
        this.observers.forEach(observer => {
            observer.disconnect();
        });
        this.observers.clear();
    }
    
    // Métricas de rendimiento
    getPerformanceMetrics() {
        return {
            loadedElements: this.loadedElements.size,
            totalObservers: this.observers.size,
            isInitialized: this.isInitialized,
            progress: this.progress
        };
    }
    
    // Destruir sistema
    destroy() {
        this.cleanupObservers();
        this.loadedElements.clear();
        this.loadingQueue = [];
        this.isInitialized = false;
        
        if (this.preloader) {
            this.preloader.remove();
        }
        
        console.log('🗑️ Sistema de lazy loading destruido');
    }
}

// Sistema de skeleton loading
class SkeletonSystem {
    constructor() {
        this.skeletonTemplates = new Map();
        this.init();
    }
    
    init() {
        this.createSkeletonTemplates();
    }
    
    createSkeletonTemplates() {
        // Template para cartón de bingo
        this.skeletonTemplates.set('bingo-card', `
            <div class="skeleton skeleton-card">
                <div class="skeleton-text short"></div>
                <div class="skeleton-text medium"></div>
                <div class="skeleton-text long"></div>
                <div class="skeleton-button"></div>
            </div>
        `);
        
        // Template para números llamados
        this.skeletonTemplates.set('numbers-grid', `
            <div class="skeleton skeleton-card">
                <div class="skeleton-text short"></div>
                <div class="skeleton-text medium"></div>
                <div class="skeleton-text long"></div>
            </div>
        `);
        
        // Template para botones
        this.skeletonTemplates.set('button', `
            <div class="skeleton skeleton-button"></div>
        `);
    }
    
    showSkeleton(container, templateName, count = 1) {
        if (!container || !this.skeletonTemplates.has(templateName)) return;
        
        const template = this.skeletonTemplates.get(templateName);
        let html = '';
        
        for (let i = 0; i < count; i++) {
            html += template;
        }
        
        container.innerHTML = html;
        container.classList.add('skeleton-container');
    }
    
    hideSkeleton(container) {
        if (!container) return;
        
        container.classList.remove('skeleton-container');
        container.innerHTML = '';
    }
}

// Inicializar sistemas cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    // Sistema de lazy loading
    window.lazyLoadingSystem = new LazyLoadingSystem();
    
    // Sistema de skeleton loading
    window.skeletonSystem = new SkeletonSystem();
    
    console.log('🎯 Sistemas de optimización inicializados');
});

// Exportar para uso global
window.LazyLoadingSystem = LazyLoadingSystem;
window.SkeletonSystem = SkeletonSystem;
