// Script para la página de bienvenida de Bingo Spain
document.addEventListener('DOMContentLoaded', function() {
    console.log('Bingo Spain - Página de Bienvenida cargada');
    
    // Inicializar animaciones
    initializeAnimations();
    
    // Configurar navegación suave
    setupSmoothScrolling();
    
    // Configurar efectos de hover
    setupHoverEffects();
    
    // Configurar contadores animados
    setupCounters();
    
    // Configurar botones
    setupButtons();
    
    // Configurar efectos de parallax
    setupParallax();
});

// Inicializar animaciones
function initializeAnimations() {
    // Animación de entrada para elementos
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);
    
    // Observar elementos para animación
    const animateElements = document.querySelectorAll('.game-card, .offer-card, .stat-card');
    animateElements.forEach(el => {
        observer.observe(el);
    });
    
    // Animación de números flotantes
    animateFloatingNumbers();
}

// Animación de números flotantes
function animateFloatingNumbers() {
    const floatingNumbers = document.querySelectorAll('.floating-number');
    
    floatingNumbers.forEach((number, index) => {
        // Crear animación personalizada para cada número
        const delay = index * 0.5;
        const duration = 4 + Math.random() * 2;
        
        number.style.animationDelay = `${delay}s`;
        number.style.animationDuration = `${duration}s`;
        
        // Agregar efecto de brillo aleatorio
        setInterval(() => {
            number.style.filter = 'brightness(1.2) drop-shadow(0 0 10px rgba(0, 212, 170, 0.5))';
            setTimeout(() => {
                number.style.filter = 'brightness(1) drop-shadow(0 0 5px rgba(0, 212, 170, 0.3))';
            }, 200);
        }, 3000 + Math.random() * 2000);
    });
}

// Configurar navegación suave
function setupSmoothScrolling() {
    const navLinks = document.querySelectorAll('.nav-link');
    
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            const targetId = link.getAttribute('href');
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

// Configurar efectos de hover
function setupHoverEffects() {
    // Efecto de hover para tarjetas de juego
    const gameCards = document.querySelectorAll('.game-card');
    
    gameCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-10px) scale(1.02)';
            card.style.boxShadow = '0 20px 40px rgba(0, 212, 170, 0.2)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0) scale(1)';
            card.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
        });
    });
    
    // Efecto de hover para tarjetas de ofertas
    const offerCards = document.querySelectorAll('.offer-card');
    
    offerCards.forEach(card => {
        card.addEventListener('mouseenter', () => {
            card.style.transform = 'translateY(-8px)';
            card.style.boxShadow = '0 16px 32px rgba(0, 0, 0, 0.25)';
        });
        
        card.addEventListener('mouseleave', () => {
            card.style.transform = 'translateY(0)';
            card.style.boxShadow = '0 8px 16px rgba(0, 0, 0, 0.2)';
        });
    });
}

// Configurar contadores animados
function setupCounters() {
    const counters = document.querySelectorAll('.stat-content h3');
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const counter = entry.target;
                const target = getCounterTarget(counter.textContent);
                animateCounter(counter, target);
                counterObserver.unobserve(counter);
            }
        });
    }, { threshold: 0.5 });
    
    counters.forEach(counter => {
        counterObserver.observe(counter);
    });
}

// Obtener el valor objetivo del contador
function getCounterTarget(text) {
    const value = text.replace(/[^\d]/g, '');
    return parseInt(value);
}

// Animar contador
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 100;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        
        // Formatear el número
        let displayValue;
        if (target >= 1000000) {
            displayValue = (current / 1000000).toFixed(1) + 'M';
        } else if (target >= 1000) {
            displayValue = (current / 1000).toFixed(0) + 'K';
        } else {
            displayValue = Math.floor(current);
        }
        
        // Agregar símbolo de euro si es necesario
        if (element.textContent.includes('€')) {
            displayValue = '€' + displayValue;
        }
        
        element.textContent = displayValue;
    }, 20);
}

// Configurar botones
function setupButtons() {
    // Botón de login
    const loginBtn = document.querySelector('.btn-login');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => {
            showLoginModal();
        });
    }
    
    // Botones de ofertas
    const offerBtns = document.querySelectorAll('.btn-offer');
    offerBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            showOfferModal(btn.closest('.offer-card'));
        });
    });
    
    // Botón de bono
    const bonusBtn = document.querySelector('.btn-secondary');
    if (bonusBtn) {
        bonusBtn.addEventListener('click', () => {
            showBonusModal();
        });
    }
}

// Mostrar modal de login
function showLoginModal() {
    const modal = createModal('Iniciar Sesión', `
        <div class="login-form">
            <div class="form-group">
                <label>Email</label>
                <input type="email" placeholder="tu@email.com" required>
            </div>
            <div class="form-group">
                <label>Contraseña</label>
                <input type="password" placeholder="••••••••" required>
            </div>
            <button class="btn-primary">Iniciar Sesión</button>
            <p class="form-footer">
                ¿No tienes cuenta? <a href="#" onclick="showRegisterModal()">Regístrate aquí</a>
            </p>
        </div>
    `);
    
    document.body.appendChild(modal);
}

// Mostrar modal de registro
function showRegisterModal() {
    const modal = createModal('Crear Cuenta', `
        <div class="register-form">
            <div class="form-group">
                <label>Nombre completo</label>
                <input type="text" placeholder="Tu nombre completo" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" placeholder="tu@email.com" required>
            </div>
            <div class="form-group">
                <label>Contraseña</label>
                <input type="password" placeholder="••••••••" required>
            </div>
            <div class="form-group">
                <label>Confirmar contraseña</label>
                <input type="password" placeholder="••••••••" required>
            </div>
            <button class="btn-primary">Crear Cuenta</button>
            <p class="form-footer">
                ¿Ya tienes cuenta? <a href="#" onclick="showLoginModal()">Inicia sesión aquí</a>
            </p>
        </div>
    `);
    
    document.body.appendChild(modal);
}

// Mostrar modal de oferta
function showOfferModal(offerCard) {
    const offerTitle = offerCard.querySelector('h3').textContent;
    const offerValue = offerCard.querySelector('.amount').textContent;
    const offerBonus = offerCard.querySelector('.bonus').textContent;
    
    const modal = createModal(offerTitle, `
        <div class="offer-details">
            <div class="offer-highlight">
                <h3>${offerValue}</h3>
                <p>${offerBonus}</p>
            </div>
            <div class="offer-terms">
                <h4>Términos y Condiciones:</h4>
                <ul>
                    <li>Oferta válida para nuevos usuarios</li>
                    <li>Depósito mínimo requerido</li>
                    <li>Premios sujetos a requisitos de apuesta</li>
                    <li>Válido por tiempo limitado</li>
                </ul>
            </div>
            <button class="btn-primary">Aceptar Oferta</button>
        </div>
    `);
    
    document.body.appendChild(modal);
}

// Mostrar modal de bono
function showBonusModal() {
    const modal = createModal('¡Bono de Bienvenida!', `
        <div class="bonus-details">
            <div class="bonus-highlight">
                <h3>€50 + 50 Cartones</h3>
                <p>¡Completamente gratis!</p>
            </div>
            <div class="bonus-features">
                <h4>Incluye:</h4>
                <ul>
                    <li>€50 de bono sin depósito</li>
                    <li>50 cartones de bingo gratis</li>
                    <li>Sin requisitos de apuesta</li>
                    <li>Válido por 24 horas</li>
                </ul>
            </div>
            <button class="btn-primary">Obtener Bono</button>
        </div>
    `);
    
    document.body.appendChild(modal);
}

// Crear modal genérico
function createModal(title, content) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h3>${title}</h3>
                <button class="modal-close">&times;</button>
            </div>
            <div class="modal-body">
                ${content}
            </div>
        </div>
    `;
    
    // Cerrar modal
    const closeBtn = modal.querySelector('.modal-close');
    closeBtn.addEventListener('click', () => {
        modal.remove();
    });
    
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
    
    return modal;
}

// Configurar efectos de parallax
function setupParallax() {
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallaxElements = document.querySelectorAll('.floating-number');
        
        parallaxElements.forEach((element, index) => {
            const speed = 0.5 + (index * 0.1);
            const yPos = -(scrolled * speed);
            element.style.transform = `translateY(${yPos}px)`;
        });
    });
}

// Efectos adicionales para la página
function addScrollEffects() {
    // Efecto de aparición para el header
    window.addEventListener('scroll', () => {
        const header = document.querySelector('.welcome-header');
        if (window.scrollY > 100) {
            header.style.background = 'rgba(26, 26, 26, 0.95)';
            header.style.backdropFilter = 'blur(10px)';
        } else {
            header.style.background = 'var(--gradient-primary)';
            header.style.backdropFilter = 'none';
        }
    });
    
    // Efecto de contador de jugadores en tiempo real
    setInterval(() => {
        const playerCount = document.querySelector('.feature span');
        if (playerCount && playerCount.textContent.includes('jugadores')) {
            const currentCount = parseInt(playerCount.textContent.match(/\d+/)[0]);
            const newCount = currentCount + Math.floor(Math.random() * 5) - 2;
            playerCount.textContent = `+${Math.max(50000, newCount).toLocaleString()} jugadores activos`;
        }
    }, 5000);
}

// Inicializar efectos adicionales
addScrollEffects();

// Agregar estilos CSS para modales
const modalStyles = `
<style>
.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    animation: fadeIn 0.3s ease;
}

.modal-content {
    background: white;
    border-radius: 15px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    animation: slideIn 0.3s ease;
}

.modal-header {
    padding: 1.5rem 2rem;
    border-bottom: 1px solid #e9ecef;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.modal-header h3 {
    margin: 0;
    color: var(--text-primary);
    font-weight: 700;
}

.modal-close {
    background: none;
    border: none;
    font-size: 2rem;
    cursor: pointer;
    color: var(--text-secondary);
    transition: color 0.3s ease;
}

.modal-close:hover {
    color: var(--text-primary);
}

.modal-body {
    padding: 2rem;
}

.form-group {
    margin-bottom: 1.5rem;
}

.form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 600;
    color: var(--text-primary);
}

.form-group input {
    width: 100%;
    padding: 0.75rem;
    border: 2px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    transition: border-color 0.3s ease;
}

.form-group input:focus {
    outline: none;
    border-color: var(--accent-color);
}

.form-footer {
    text-align: center;
    margin-top: 1rem;
    color: var(--text-secondary);
}

.form-footer a {
    color: var(--accent-color);
    text-decoration: none;
    font-weight: 600;
}

.offer-details, .bonus-details {
    text-align: center;
}

.offer-highlight, .bonus-highlight {
    margin-bottom: 2rem;
}

.offer-highlight h3, .bonus-highlight h3 {
    font-size: 2.5rem;
    color: var(--accent-color);
    margin-bottom: 0.5rem;
}

.offer-terms, .bonus-features {
    text-align: left;
    margin-bottom: 2rem;
}

.offer-terms h4, .bonus-features h4 {
    margin-bottom: 1rem;
    color: var(--text-primary);
}

.offer-terms ul, .bonus-features ul {
    list-style: none;
    padding: 0;
}

.offer-terms li, .bonus-features li {
    padding: 0.5rem 0;
    border-bottom: 1px solid var(--border-color);
    color: var(--text-secondary);
}

.offer-terms li:before, .bonus-features li:before {
    content: '✓';
    color: var(--accent-color);
    font-weight: bold;
    margin-right: 0.5rem;
}

@keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
}

@keyframes slideIn {
    from { transform: translateY(-50px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
}

.animate-in {
    animation: slideUp 0.6s ease forwards;
}

@keyframes slideUp {
    from {
        opacity: 0;
        transform: translateY(30px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
</style>
`;

// Agregar estilos al head
document.head.insertAdjacentHTML('beforeend', modalStyles);

// Función para cerrar la página de bienvenida y ir al login
function closeWelcomeAndPlay() {
    // Marcar que ya visitó la página de bienvenida
    localStorage.setItem('spainbingo_welcome_visited', 'true');
    
    // Mostrar mensaje de transición
    showTransitionMessage();
    
    // Redirigir al login después de un breve delay
    setTimeout(() => {
        window.location.href = 'login.html';
    }, 1500);
}

// Mostrar mensaje de transición
function showTransitionMessage() {
    const transitionModal = document.createElement('div');
    transitionModal.className = 'transition-modal';
    transitionModal.innerHTML = `
        <div class="transition-content">
            <div class="transition-icon">
                <i class="fas fa-dice"></i>
            </div>
            <h3>¡Preparando tu juego!</h3>
            <p>Cargando SpainBingo...</p>
            <div class="loading-spinner"></div>
        </div>
    `;
    
    document.body.appendChild(transitionModal);
    
    // Agregar estilos para el modal de transición
    const transitionStyles = `
        <style>
        .transition-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #00d4aa 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            animation: fadeIn 0.5s ease;
        }
        
        .transition-content {
            text-align: center;
            color: white;
        }
        
        .transition-icon {
            font-size: 4rem;
            color: #00d4aa;
            margin-bottom: 1rem;
            animation: diceRoll 2s ease-in-out infinite;
        }
        
        .transition-content h3 {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: white;
        }
        
        .transition-content p {
            font-size: 1.2rem;
            color: rgba(255, 255, 255, 0.8);
            margin-bottom: 2rem;
        }
        
        .loading-spinner {
            width: 40px;
            height: 40px;
            border: 4px solid rgba(255, 255, 255, 0.3);
            border-top: 4px solid #00d4aa;
            border-radius: 50%;
            animation: spin 1s linear infinite;
            margin: 0 auto;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        </style>
    `;
    
    document.head.insertAdjacentHTML('beforeend', transitionStyles);
}

console.log('Bingo Spain - Script de bienvenida inicializado correctamente'); 