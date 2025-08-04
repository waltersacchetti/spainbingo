/**
 * Sistema de Autenticación - Bingo Spain
 * Maneja login, registro y gestión de sesiones
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.initializeAuth();
    }

    /**
     * Inicializar sistema de autenticación
     */
    initializeAuth() {
        this.checkExistingSession();
        this.setupEventListeners();
        console.log('🔐 Sistema de autenticación inicializado');
    }

    /**
     * Verificar sesión existente
     */
    checkExistingSession() {
        const session = localStorage.getItem('spainbingo_session');
        if (session) {
            try {
                const userData = JSON.parse(session);
                const now = Date.now();
                
                // Verificar si la sesión no ha expirado (24 horas)
                if (userData.expiresAt && now < userData.expiresAt) {
                    this.currentUser = userData.user;
                    this.isAuthenticated = true;
                    console.log('✅ Sesión existente encontrada');
                    
                    // Si estamos en la página de login y ya estamos autenticados, redirigir al juego
                    if (window.location.pathname.includes('login.html')) {
                        this.redirectToGame();
                    }
                } else {
                    // Sesión expirada
                    this.logout();
                }
            } catch (error) {
                console.error('Error al parsear sesión:', error);
                this.logout();
            }
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }

        // Input validation
        this.setupInputValidation();
    }

    /**
     * Configurar validación de inputs
     */
    setupInputValidation() {
        // Email validation
        const emailInputs = document.querySelectorAll('input[type="email"]');
        emailInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validateEmail(input.value, input.id);
            });
        });

        // Password validation
        const passwordInputs = document.querySelectorAll('input[type="password"]');
        passwordInputs.forEach(input => {
            input.addEventListener('blur', () => {
                this.validatePassword(input.value, input.id);
            });
        });

        // Name validation
        const nameInput = document.getElementById('registerName');
        if (nameInput) {
            nameInput.addEventListener('blur', () => {
                this.validateName(nameInput.value);
            });
        }
    }

    /**
     * Manejar login
     */
    async handleLogin() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        // Validar inputs
        if (!this.validateLoginInputs(email, password)) {
            return;
        }

        // Mostrar loading
        this.showLoading('login');

        try {
            // Simular llamada a API
            await this.simulateApiCall(1000);
            
            // Verificar credenciales (en producción esto sería una llamada real a la API)
            const user = this.authenticateUser(email, password);
            
            if (user) {
                this.loginSuccess(user, rememberMe);
            } else {
                this.showError('login', 'Email o contraseña incorrectos');
            }
        } catch (error) {
            this.showError('login', 'Error al conectar con el servidor');
        } finally {
            this.hideLoading('login');
        }
    }

    /**
     * Manejar registro
     */
    async handleRegister() {
        const name = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;
        const acceptAge = document.getElementById('acceptAge').checked;

        // Validar inputs
        if (!this.validateRegisterInputs(name, email, password, confirmPassword, acceptTerms, acceptAge)) {
            return;
        }

        // Mostrar loading
        this.showLoading('register');

        try {
            // Simular llamada a API
            await this.simulateApiCall(1500);
            
            // Verificar si el email ya existe
            if (this.emailExists(email)) {
                this.showError('register', 'Este email ya está registrado');
                return;
            }

            // Crear usuario
            const user = this.createUser(name, email, password);
            this.loginSuccess(user, false);
            
        } catch (error) {
            this.showError('register', 'Error al crear la cuenta');
        } finally {
            this.hideLoading('register');
        }
    }

    /**
     * Validar inputs de login
     */
    validateLoginInputs(email, password) {
        let isValid = true;

        if (!email || !this.validateEmail(email, 'loginEmail')) {
            isValid = false;
        }

        if (!password) {
            this.showFieldError('loginPassword', 'La contraseña es requerida');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Validar inputs de registro
     */
    validateRegisterInputs(name, email, password, confirmPassword, acceptTerms, acceptAge) {
        let isValid = true;

        if (!name || !this.validateName(name)) {
            isValid = false;
        }

        if (!email || !this.validateEmail(email, 'registerEmail')) {
            isValid = false;
        }

        if (!password || !this.validatePassword(password, 'registerPassword')) {
            isValid = false;
        }

        if (password !== confirmPassword) {
            this.showFieldError('registerConfirmPassword', 'Las contraseñas no coinciden');
            isValid = false;
        }

        if (!acceptTerms) {
            alert('Debes aceptar los términos y condiciones');
            isValid = false;
        }

        if (!acceptAge) {
            alert('Debes confirmar que eres mayor de 18 años');
            isValid = false;
        }

        return isValid;
    }

    /**
     * Validar email
     */
    validateEmail(email, fieldId) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        
        if (!email) {
            this.showFieldError(fieldId, 'El email es requerido');
            return false;
        }

        if (!emailRegex.test(email)) {
            this.showFieldError(fieldId, 'Formato de email inválido');
            return false;
        }

        this.clearFieldError(fieldId);
        return true;
    }

    /**
     * Validar contraseña
     */
    validatePassword(password, fieldId) {
        if (!password) {
            this.showFieldError(fieldId, 'La contraseña es requerida');
            return false;
        }

        if (password.length < 8) {
            this.showFieldError(fieldId, 'La contraseña debe tener al menos 8 caracteres');
            return false;
        }

        if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
            this.showFieldError(fieldId, 'La contraseña debe contener mayúsculas, minúsculas y números');
            return false;
        }

        this.clearFieldError(fieldId);
        return true;
    }

    /**
     * Validar nombre
     */
    validateName(name) {
        if (!name) {
            this.showFieldError('registerName', 'El nombre es requerido');
            return false;
        }

        if (name.length < 2) {
            this.showFieldError('registerName', 'El nombre debe tener al menos 2 caracteres');
            return false;
        }

        this.clearFieldError('registerName');
        return true;
    }

    /**
     * Mostrar error de campo
     */
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + 'Error');
        
        if (field) {
            field.classList.add('error');
        }
        
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        }
    }

    /**
     * Limpiar error de campo
     */
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        const errorElement = document.getElementById(fieldId + 'Error');
        
        if (field) {
            field.classList.remove('error');
        }
        
        if (errorElement) {
            errorElement.style.display = 'none';
        }
    }

    /**
     * Mostrar error general
     */
    showError(type, message) {
        alert(message); // En producción esto sería un toast o modal más elegante
    }

    /**
     * Mostrar loading
     */
    showLoading(type) {
        const button = document.getElementById(type + 'Btn');
        const spinner = document.getElementById(type + 'Spinner');
        
        if (button) {
            button.disabled = true;
            button.textContent = type === 'login' ? 'Iniciando sesión...' : 'Creando cuenta...';
        }
        
        if (spinner) {
            spinner.style.display = 'inline-block';
        }
    }

    /**
     * Ocultar loading
     */
    hideLoading(type) {
        const button = document.getElementById(type + 'Btn');
        const spinner = document.getElementById(type + 'Spinner');
        
        if (button) {
            button.disabled = false;
            button.textContent = type === 'login' ? 'Iniciar Sesión' : 'Crear Cuenta';
        }
        
        if (spinner) {
            spinner.style.display = 'none';
        }
    }

    /**
     * Simular llamada a API
     */
    simulateApiCall(delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    /**
     * Autenticar usuario (simulado)
     */
    authenticateUser(email, password) {
        // En producción esto sería una llamada real a la API
        const users = JSON.parse(localStorage.getItem('spainbingo_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);
        
        if (user) {
            return {
                id: user.id,
                name: user.name,
                email: user.email,
                balance: user.balance || 50.00,
                level: user.level || 1,
                createdAt: user.createdAt
            };
        }
        
        return null;
    }

    /**
     * Verificar si email existe
     */
    emailExists(email) {
        const users = JSON.parse(localStorage.getItem('spainbingo_users') || '[]');
        return users.some(u => u.email === email);
    }

    /**
     * Crear usuario
     */
    createUser(name, email, password) {
        const users = JSON.parse(localStorage.getItem('spainbingo_users') || '[]');
        
        const newUser = {
            id: 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            name: name,
            email: email,
            password: password, // En producción esto estaría hasheado
            balance: 50.00,
            level: 1,
            createdAt: new Date().toISOString()
        };
        
        users.push(newUser);
        localStorage.setItem('spainbingo_users', JSON.stringify(users));
        
        return {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            balance: newUser.balance,
            level: newUser.level,
            createdAt: newUser.createdAt
        };
    }

    /**
     * Login exitoso
     */
    loginSuccess(user, rememberMe) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Crear sesión
        const sessionData = {
            user: user,
            expiresAt: rememberMe ? Date.now() + (7 * 24 * 60 * 60 * 1000) : Date.now() + (24 * 60 * 60 * 1000),
            createdAt: Date.now()
        };
        
        localStorage.setItem('spainbingo_session', JSON.stringify(sessionData));
        
        // Registrar evento de auditoría
        if (window.securityManager) {
            window.securityManager.logEvent('user_login', { userId: user.id, email: user.email });
        }
        
        console.log('✅ Login exitoso:', user.name);
        
        // Redirigir al juego
        this.redirectToGame();
    }

    /**
     * Redirigir al juego
     */
    redirectToGame() {
        // Marcar que ya visitó la página de bienvenida
        localStorage.setItem('spainbingo_welcome_visited', 'true');
        
        // Redirigir al juego
        window.location.href = 'index.html';
    }

    /**
     * Logout
     */
    logout() {
        this.currentUser = null;
        this.isAuthenticated = false;
        localStorage.removeItem('spainbingo_session');
        
        // Registrar evento de auditoría
        if (window.securityManager) {
            window.securityManager.logEvent('user_logout', {});
        }
        
        console.log('👋 Usuario desconectado');
        
        // Redirigir a login
        if (!window.location.pathname.includes('login.html')) {
            window.location.href = 'login.html';
        }
    }

    /**
     * Verificar si está autenticado
     */
    isUserAuthenticated() {
        return this.isAuthenticated && this.currentUser !== null;
    }

    /**
     * Obtener usuario actual
     */
    getCurrentUser() {
        return this.currentUser;
    }
}

// Funciones globales para la interfaz

/**
 * Cambiar entre tabs de login y registro
 */
function switchTab(tab) {
    const tabs = document.querySelectorAll('.auth-tab');
    const forms = document.querySelectorAll('.auth-form');
    
    tabs.forEach(t => t.classList.remove('active'));
    forms.forEach(f => f.classList.remove('active'));
    
    document.querySelector(`[onclick="switchTab('${tab}')"]`).classList.add('active');
    document.getElementById(tab + 'Form').classList.add('active');
}

/**
 * Login social (simulado)
 */
function socialLogin(provider) {
    alert(`Login con ${provider} - En producción esto integraría con las APIs reales de ${provider}`);
}

/**
 * Mostrar recuperación de contraseña
 */
function showForgotPassword() {
    alert('Recuperación de contraseña - En producción esto enviaría un email de recuperación');
}

// Inicializar sistema de autenticación
const authManager = new AuthManager();

// Exportar para uso global
window.authManager = authManager;

console.log('🔐 Sistema de autenticación cargado'); 