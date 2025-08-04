/**
 * Sistema de Autenticación - SpainBingo
 * Maneja login, registro y gestión de sesiones con base de datos real
 */

console.log('🚀 auth.js cargado correctamente');

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.sessionToken = null;
        this.initializeAuth();
    }

    /**
     * Inicializar sistema de autenticación
     */
    async initializeAuth() {
        console.log('🔐 Iniciando sistema de autenticación...');
        await this.loadSession();
        this.setupEventListeners();
        console.log('🔐 Sistema de autenticación inicializado');
    }

    /**
     * Cargar sesión desde localStorage
     */
    async loadSession() {
        const session = localStorage.getItem('spainbingo_session');
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                const now = Date.now();
                const sessionAge = now - sessionData.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 horas

                if (sessionAge < maxAge) {
                    // Verificar con el servidor que la sesión sigue siendo válida
                    console.log('🔍 Verificando sesión con el servidor...');
                    const isValid = await this.verifySessionWithServer(sessionData.token);
                    
                    if (isValid) {
                        this.isAuthenticated = true;
                        this.currentUser = sessionData.user;
                        this.sessionToken = sessionData.token;
                        console.log('✅ Sesión válida confirmada por el servidor');
                        
                        // Si estamos en la página de login y ya estamos autenticados, redirigir al juego
                        if (window.location.pathname.includes('login.html')) {
                            this.redirectToGame();
                        }
                    } else {
                        console.log('❌ Sesión inválida según el servidor');
                        this.logout();
                    }
                } else {
                    // Sesión expirada
                    console.log('❌ Sesión expirada');
                    this.logout();
                }
            } catch (error) {
                console.error('Error cargando sesión:', error);
                this.logout();
            }
        } else {
            console.log('🔍 No hay sesión existente');
        }
    }

    /**
     * Verificar sesión con el servidor
     */
    async verifySessionWithServer(token) {
        try {
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('✅ Sesión verificada con el servidor');
                    return true;
                }
            }
            
            console.log('❌ Sesión no válida en el servidor');
            return false;
        } catch (error) {
            console.error('❌ Error verificando sesión:', error);
            return false;
        }
    }

    /**
     * Configurar event listeners
     */
    setupEventListeners() {
        console.log('🔗 Configurando event listeners...');
        
        // Login form
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            console.log('✅ Formulario de login encontrado');
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('📝 Evento submit del login capturado');
                this.handleLogin();
            });
        } else {
            console.log('❌ Formulario de login NO encontrado');
        }

        // Register form
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            console.log('✅ Formulario de registro encontrado');
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('📝 Evento submit del registro capturado');
                this.handleRegister();
            });
        } else {
            console.log('❌ Formulario de registro NO encontrado');
        }

        // Input validation
        this.setupInputValidation();
        console.log('🔗 Event listeners configurados');
        
        // Event listener directo al botón de registro como respaldo
        const registerBtn = document.getElementById('registerBtn');
        if (registerBtn) {
            console.log('🔘 Botón de registro encontrado, agregando listener directo');
            registerBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔘 Click directo en botón de registro');
                this.handleRegister();
            });
        } else {
            console.log('❌ Botón de registro NO encontrado');
        }
        
        // Event listener directo al botón de login como respaldo
        const loginBtn = document.getElementById('loginBtn');
        if (loginBtn) {
            console.log('🔘 Botón de login encontrado, agregando listener directo');
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🔘 Click directo en botón de login');
                this.handleLogin();
            });
        } else {
            console.log('❌ Botón de login NO encontrado');
        }
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
        console.log('🔐 ===== INICIO DE LOGIN =====');
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        console.log('📝 Datos del login:', { email, rememberMe });

        // Validar inputs
        if (!this.validateLoginInputs(email, password)) {
            console.log('❌ Validación de login fallida');
            return;
        }

        console.log('✅ Validación de login exitosa');

        // Mostrar loading
        this.showLoading('login');

        try {
            const result = await this.login(email, password);
            
            console.log('📥 Respuesta del login:', result);
            
            if (result.success) {
                console.log('✅ Login exitoso');
                this.loginSuccess(result.user, rememberMe);
            } else {
                console.log('❌ Error en login:', result.error);
                this.showError('login', result.error);
            }
        } catch (error) {
            console.error('❌ Error en login:', error);
            this.showError('login', 'Error al conectar con el servidor');
        } finally {
            this.hideLoading('login');
        }
    }

    /**
     * Manejar registro
     */
    async handleRegister() {
        console.log('🔐 ===== INICIO DE REGISTRO =====');
        console.log('🔐 Iniciando proceso de registro...');
        
        const fullName = document.getElementById('registerName').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;
        const acceptAge = document.getElementById('acceptAge').checked;

        console.log('📝 Datos del formulario:', { fullName, email, acceptTerms, acceptAge });

        // Validar inputs
        if (!this.validateRegisterInputs(fullName, email, password, confirmPassword, acceptTerms, acceptAge)) {
            console.log('❌ Validación fallida');
            return;
        }

        console.log('✅ Validación exitosa');

        // Mostrar loading
        this.showLoading('register');

        try {
            // Separar nombre completo en nombre y apellido
            const nameParts = fullName.trim().split(' ');
            const firstName = nameParts[0] || '';
            const lastName = nameParts.slice(1).join(' ') || '';
            
            // Generar username basado en el email
            const username = email.split('@')[0];

            const userData = {
                username,
                email,
                password,
                firstName,
                lastName,
                dateOfBirth: '1990-01-01', // Valor por defecto
                phone: ''
            };

            console.log('📤 Enviando datos al servidor:', { ...userData, password: '[HIDDEN]' });

            const result = await this.register(userData);
            
            console.log('📥 Respuesta del servidor:', result);
            
            if (result.success) {
                console.log('✅ Registro exitoso');
                this.loginSuccess(result.user, false);
            } else {
                console.log('❌ Error en registro:', result.error);
                this.showError('register', result.error);
            }
        } catch (error) {
            console.error('❌ Error en registro:', error);
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

        if (!email) {
            this.showFieldError('loginEmail', 'El email es requerido');
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
    validateRegisterInputs(fullName, email, password, confirmPassword, acceptTerms, acceptAge) {
        let isValid = true;

        if (!fullName || !this.validateName(fullName)) {
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
        const errorElement = document.getElementById(type + 'Error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
        } else {
            alert(message);
        }
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
     * Login real con base de datos
     */
    async login(email, password) {
        try {
            console.log('🌐 Enviando petición de login...');
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            console.log('📡 Respuesta del servidor:', response.status, response.statusText);
            const data = await response.json();
            console.log('📄 Datos de respuesta:', data);
            
            if (data.success) {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.sessionToken = data.token;
                
                console.log('✅ Login exitoso en el servidor');
                return { success: true, user: this.currentUser };
            } else {
                console.log('❌ Login fallido:', data.error);
                return { success: false, error: data.error || 'Error de autenticación' };
            }
        } catch (error) {
            console.error('❌ Error en login:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    /**
     * Registro real con base de datos
     */
    async register(userData) {
        try {
            console.log('🌐 Enviando petición a /api/register...');
            
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            console.log('📡 Respuesta del servidor:', response.status, response.statusText);

            const data = await response.json();
            console.log('📄 Datos de respuesta:', data);
            
            if (data.success) {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.sessionToken = data.token;
                
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: data.error || 'Error de registro' };
            }
        } catch (error) {
            console.error('❌ Error en registro:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    /**
     * Obtener perfil del usuario
     */
    async getProfile() {
        if (!this.sessionToken) {
            return { success: false, error: 'No autenticado' };
        }

        try {
            const response = await fetch('/api/user/profile', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json',
                }
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                return { success: true, user: this.currentUser };
            } else {
                if (response.status === 401) {
                    this.logout();
                }
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Error obteniendo perfil:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    /**
     * Actualizar perfil
     */
    async updateProfile(profileData) {
        if (!this.sessionToken) {
            return { success: false, error: 'No autenticado' };
        }

        try {
            const response = await fetch('/api/user/profile', {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${this.sessionToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(profileData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.currentUser = data.user;
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: data.error };
            }
        } catch (error) {
            console.error('Error actualizando perfil:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    /**
     * Login exitoso
     */
    loginSuccess(user, rememberMe) {
        this.currentUser = user;
        this.isAuthenticated = true;
        
        // Guardar en localStorage
        localStorage.setItem('spainbingo_session', JSON.stringify({
            user: this.currentUser,
            token: this.sessionToken,
            timestamp: Date.now()
        }));
        
        // Registrar evento de auditoría
        if (window.securityManager) {
            window.securityManager.logEvent('user_login', { userId: user.id, username: user.username });
        }
        
        console.log('✅ Login exitoso:', user.username);
        
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
        this.sessionToken = null;
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

    /**
     * Obtener token de sesión
     */
    getSessionToken() {
        return this.sessionToken;
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

// Inicializar de forma asíncrona
authManager.initializeAuth().then(() => {
    console.log('🔐 Sistema de autenticación inicializado completamente');
}).catch(error => {
    console.error('❌ Error inicializando autenticación:', error);
});

// Exportar para uso global
window.authManager = authManager;

console.log('🔐 Sistema de autenticación cargado');
console.log('🔍 authManager disponible en:', window.authManager); 