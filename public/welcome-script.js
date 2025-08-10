// ===== WELCOME SCRIPT - BINGOROYAL =====

// Función para cerrar la página de bienvenida y ir al juego
function closeWelcomeAndPlay() {
    // Marcar que se ha visitado la página de bienvenida
    localStorage.setItem('bingoroyal_welcome_visited', 'true');
    
    // Redirigir al juego
    window.location.href = '/game';
}

// Función para ir al login
function goToLogin() {
    window.location.href = '/login.html';
}

// Animaciones de números flotantes
function animateFloatingNumbers() {
    const floatingNumbers = document.querySelectorAll('.floating-number');
    
    floatingNumbers.forEach((number, index) => {
        // Aplicar animación con delay diferente para cada número
        number.style.animationDelay = `${index * 0.5}s`;
    });
}

// Verificar que todos los elementos necesarios estén disponibles
function verifyRequiredElements() {
    const requiredElements = {
        cardCells: document.querySelectorAll('.card-cell'),
        gameCards: document.querySelectorAll('.game-card'),
        offerCards: document.querySelectorAll('.offer-card'),
        floatingNumbers: document.querySelectorAll('.floating-number'),
        heroSection: document.querySelector('.hero-section'),
        statCounters: document.querySelectorAll('.stat-content h3')
    };
    
    const missingElements = [];
    
    Object.entries(requiredElements).forEach(([name, elements]) => {
        if (!elements || elements.length === 0) {
            missingElements.push(name);
        }
    });
    
    if (missingElements.length > 0) {
        console.log(`⚠️ Elementos faltantes: ${missingElements.join(', ')}`);
        return false;
    }
    
    console.log('✅ Todos los elementos requeridos están disponibles');
    return true;
}

function animateBingoCard() {
    const cardCells = document.querySelectorAll('.card-cell');
    
    // Verificar que existan elementos card-cell antes de continuar
    if (!cardCells || cardCells.length === 0) {
        console.log('⚠️ No se encontraron elementos card-cell, reintentando en 2 segundos...');
        setTimeout(animateBingoCard, 2000);
        return;
    }
    
    let currentIndex = 0;
    
    const interval = setInterval(() => {
        // Verificar que el elemento actual existe y es válido
        if (currentIndex < cardCells.length && cardCells[currentIndex]) {
            try {
                // Marcar celda como llamada
                cardCells[currentIndex].classList.add('called');
                
                // Remover la clase después de un tiempo
                setTimeout(() => {
                    if (cardCells[currentIndex] && cardCells[currentIndex].classList) {
                        cardCells[currentIndex].classList.remove('called');
                    }
                }, 2000);
                
                currentIndex++;
            } catch (error) {
                console.error('❌ Error al animar celda:', error);
                clearInterval(interval);
                // Reintentar después de un tiempo
                setTimeout(animateBingoCard, 5000);
            }
        } else {
            clearInterval(interval);
            // Reiniciar después de un tiempo
            setTimeout(animateBingoCard, 5000);
        }
    }, 1000);
}

// Efectos de hover para las tarjetas
function setupCardHoverEffects() {
    const gameCards = document.querySelectorAll('.game-card');
    const offerCards = document.querySelectorAll('.offer-card');
    
    gameCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
    
    offerCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-10px) scale(1.02)';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
        });
    });
}

// Contador animado para estadísticas
function animateCounters() {
    const counters = document.querySelectorAll('.stat-content h3');
    
    counters.forEach(counter => {
        const target = parseInt(counter.textContent.replace(/[^\d]/g, ''));
        const duration = 2000; // 2 segundos
        const step = target / (duration / 16); // 60 FPS
        let current = 0;
        
        const timer = setInterval(() => {
            current += step;
            if (current >= target) {
                current = target;
                clearInterval(timer);
            }
            
            // Formatear el número según el tipo
            if (counter.textContent.includes('€')) {
                counter.textContent = `€${Math.floor(current).toLocaleString()}`;
            } else if (counter.textContent.includes('+')) {
                counter.textContent = `${Math.floor(current).toLocaleString()}+`;
            } else if (counter.textContent.includes('/')) {
                counter.textContent = counter.textContent.replace(/\d+/, Math.floor(current));
            } else {
                counter.textContent = Math.floor(current).toLocaleString();
            }
        }, 16);
    });
}

// Efectos de parallax para el hero
function setupParallaxEffect() {
    const heroSection = document.querySelector('.hero-section');
    const floatingNumbers = document.querySelectorAll('.floating-number');
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const rate = scrolled * -0.5;
        
        floatingNumbers.forEach((number, index) => {
            const speed = 0.5 + (index * 0.1);
            number.style.transform = `translateY(${rate * speed}px)`;
        });
    });
}

// Efectos de entrada para elementos
function setupEntranceAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Observar elementos para animación de entrada
    const animatedElements = document.querySelectorAll('.game-card, .offer-card, .stat-card');
    animatedElements.forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Efectos de sonido (opcional)
function setupSoundEffects() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-game, .btn-offer');
    
    buttons.forEach(button => {
        button.addEventListener('click', function() {
            // Crear efecto de sonido sutil
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(400, audioContext.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        });
    });
}

// Efectos de partículas de fondo
function setupParticleEffects() {
    const heroSection = document.querySelector('.hero-section');
    
    // Crear partículas de fondo
    for (let i = 0; i < 20; i++) {
        const particle = document.createElement('div');
        particle.className = 'background-particle';
        particle.style.cssText = `
            position: absolute;
            width: 4px;
            height: 4px;
            background: rgba(255, 215, 0, 0.3);
            border-radius: 50%;
            pointer-events: none;
            animation: particleFloat ${3 + Math.random() * 4}s linear infinite;
            left: ${Math.random() * 100}%;
            top: ${Math.random() * 100}%;
        `;
        heroSection.appendChild(particle);
    }
    
    // Agregar CSS para la animación de partículas
    const style = document.createElement('style');
    style.textContent = `
        @keyframes particleFloat {
            0% {
                transform: translateY(100vh) rotate(0deg);
                opacity: 0;
            }
            10% {
                opacity: 1;
            }
            90% {
                opacity: 1;
            }
            100% {
                transform: translateY(-100px) rotate(360deg);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// Efectos de hover para botones
function setupButtonEffects() {
    const buttons = document.querySelectorAll('.btn-primary, .btn-secondary, .btn-game, .btn-offer');
    
    buttons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-3px) scale(1.05)';
            this.style.boxShadow = '0 10px 25px rgba(233, 69, 96, 0.4)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0) scale(1)';
            this.style.boxShadow = '';
        });
    });
}

// Efectos de texto animado
function setupTextAnimations() {
    const heroTitle = document.querySelector('.hero-text h2');
    if (heroTitle) {
        const text = heroTitle.textContent;
        heroTitle.innerHTML = '';
        
        text.split('').forEach((char, index) => {
            const span = document.createElement('span');
            span.textContent = char;
            span.style.animationDelay = `${index * 0.1}s`;
            span.style.animation = 'textFadeIn 0.5s ease forwards';
            span.style.opacity = '0';
            heroTitle.appendChild(span);
        });
        
        // Agregar CSS para la animación de texto
        const style = document.createElement('style');
        style.textContent = `
            @keyframes textFadeIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
        `;
        document.head.appendChild(style);
    }
}

// Efectos de scroll suave
function setupSmoothScroll() {
    const navLinks = document.querySelectorAll('.nav-link[href^="#"]');
    
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Efectos de carga progresiva
function setupProgressiveLoading() {
    const sections = document.querySelectorAll('section');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, {
        threshold: 0.1
    });
    
    sections.forEach(section => {
        section.style.opacity = '0';
        section.style.transform = 'translateY(50px)';
        section.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
        observer.observe(section);
    });
}

// Inicialización cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    console.log('🎮 Welcome script inicializado');
    
    function initializeWelcomeScript() {
        // Verificar que todos los elementos estén disponibles
        if (!verifyRequiredElements()) {
            console.log('🔄 Reintentando inicialización en 1 segundo...');
            setTimeout(initializeWelcomeScript, 1000);
            return;
        }
        
        // Inicializar todas las animaciones y efectos
        animateFloatingNumbers();
        animateBingoCard();
        setupCardHoverEffects();
        setupParallaxEffect();
        setupEntranceAnimations();
        setupButtonEffects();
        setupTextAnimations();
        setupSmoothScroll();
        setupProgressiveLoading();
        
        // Efectos opcionales (descomentar si se desean)
        // setupSoundEffects();
        // setupParticleEffects();
        
        // Iniciar contadores después de un delay
        setTimeout(animateCounters, 1000);
        
        console.log('✅ Todos los efectos de bienvenida inicializados');
    }
    
    // Iniciar con un pequeño delay para asegurar renderizado completo
    setTimeout(initializeWelcomeScript, 100);
});

// Efectos adicionales para dispositivos móviles
function setupMobileEffects() {
    if (window.innerWidth <= 768) {
        // Ajustar animaciones para móviles
        const floatingNumbers = document.querySelectorAll('.floating-number');
        floatingNumbers.forEach(number => {
            number.style.fontSize = '0.8rem';
            number.style.padding = '0.5rem';
        });
        
        // Reducir velocidad de animaciones en móviles
        const animatedElements = document.querySelectorAll('[style*="animation"]');
        animatedElements.forEach(el => {
            const currentAnimation = el.style.animation;
            if (currentAnimation) {
                el.style.animation = currentAnimation.replace(/\d+s/g, (match) => {
                    const time = parseFloat(match) * 1.5;
                    return time + 's';
                });
            }
        });
    }
}

// Llamar setup de móviles después de la carga
window.addEventListener('load', setupMobileEffects);

// Efectos de performance
function optimizePerformance() {
    // Usar requestAnimationFrame para animaciones suaves
    let ticking = false;
    
    function updateAnimations() {
        // Aquí se pueden agregar animaciones que requieran 60fps
        ticking = false;
    }
    
    function requestTick() {
        if (!ticking) {
            requestAnimationFrame(updateAnimations);
            ticking = true;
        }
    }
    
    // Escuchar eventos que requieran animaciones suaves
    window.addEventListener('scroll', requestTick);
    window.addEventListener('resize', requestTick);
}

// Inicializar optimizaciones de performance
optimizePerformance();

console.log('🎯 Welcome script cargado y listo'); 