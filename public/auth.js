/**
 * Sistema de Autenticación - SpainBingo
 * Maneja login, registro y gestión de sesiones con base de datos real
 */

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isAuthenticated = false;
        this.sessionToken = null;
        this.apiBaseUrl = this.getApiBaseUrl();
        this.initializeAuth();
    }

    /**
     * Obtener la URL base para las APIs
     */
    getApiBaseUrl() {
        // Usar URL relativa para que funcione tanto en local como en producción
        return '';
    }

    /**
     * Inicializar sistema de autenticación
     */
    initializeAuth() {
        this.loadSession();
        this.setupEventListeners();
        console.log('🔐 Sistema de autenticación inicializado');
    }

    /**
     * Cargar sesión desde localStorage con validación de seguridad
     */
    loadSession() {
        const session = localStorage.getItem('spainbingo_session');
        if (session) {
            try {
                const sessionData = JSON.parse(session);
                
                // Validación de estructura de datos
                if (!sessionData || typeof sessionData !== 'object') {
                    console.warn('⚠️ Estructura de sesión inválida');
                    this.logout();
                    return;
                }

                // Validación de campos requeridos
                if (!sessionData.timestamp || !sessionData.user || !sessionData.token) {
                    console.warn('⚠️ Datos de sesión incompletos');
                    this.logout();
                    return;
                }

                // Validación de tipos de datos
                if (typeof sessionData.timestamp !== 'number' || 
                    typeof sessionData.user !== 'object' || 
                    typeof sessionData.token !== 'string') {
                    console.warn('⚠️ Tipos de datos de sesión inválidos');
                    this.logout();
                    return;
                }

                const now = Date.now();
                const sessionAge = now - sessionData.timestamp;
                const maxAge = 24 * 60 * 60 * 1000; // 24 horas

                // Validación de tiempo de sesión
                if (sessionAge < 0 || sessionAge > maxAge) {
                    console.warn('⚠️ Sesión expirada o tiempo inválido');
                    this.logout();
                    return;
                }

                // Validación de token
                if (sessionData.token.length < 32) {
                    console.warn('⚠️ Token de sesión inválido');
                    this.logout();
                    return;
                }

                this.isAuthenticated = true;
                this.currentUser = sessionData.user;
                this.sessionToken = sessionData.token;
                console.log('✅ Sesión existente validada y cargada');
                
                // Si estamos en la página de login y ya estamos autenticados, redirigir al juego
                if (window.location.pathname.includes('login.html')) {
                    this.redirectToGame();
                }
            } catch (error) {
                console.error('🚨 Error cargando sesión:', error);
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

        // Username validation
        const usernameInput = document.getElementById('registerUsername');
        if (usernameInput) {
            usernameInput.addEventListener('blur', () => {
                this.validateUsername(usernameInput.value);
            });
        }

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
            const result = await this.login(email, password);
            
            if (result.success) {
                this.loginSuccess(result.user, rememberMe);
            } else {
                this.showError('login', result.error);
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
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;
        const firstName = document.getElementById('registerFirstName').value;
        const lastName = document.getElementById('registerLastName').value;
        const dateOfBirth = document.getElementById('registerDateOfBirth').value;
        const phone = document.getElementById('registerPhone').value;
        const acceptTerms = document.getElementById('acceptTerms').checked;
        const acceptAge = document.getElementById('acceptAge').checked;

        // Validar inputs
        if (!this.validateRegisterInputs(username, email, password, confirmPassword, firstName, lastName, dateOfBirth, acceptTerms, acceptAge)) {
            return;
        }

        // Mostrar loading
        this.showLoading('register');

        try {
            const userData = {
                username,
                email,
                password,
                firstName,
                lastName,
                dateOfBirth,
                phone,
                confirmationMethod: document.getElementById('confirmationMethod').value
            };

            const result = await this.registerWithConfirmation(userData);
            
            if (result.success) {
                // No hacer login automático, la redirección se maneja en registerWithConfirmation
                console.log('✅ Registro exitoso, redirigiendo a verificación...');
            } else {
                this.showError('register', result.error);
            }
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
    validateRegisterInputs(username, email, password, confirmPassword, firstName, lastName, dateOfBirth, acceptTerms, acceptAge) {
        let isValid = true;

        if (!username || !this.validateUsername(username)) {
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

        if (!firstName) {
            this.showFieldError('registerFirstName', 'El nombre es requerido');
            isValid = false;
        }

        if (!lastName) {
            this.showFieldError('registerLastName', 'El apellido es requerido');
            isValid = false;
        }

        if (!dateOfBirth) {
            this.showFieldError('registerDateOfBirth', 'La fecha de nacimiento es requerida');
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
     * Validar username
     */
    validateUsername(username) {
        if (!username) {
            this.showFieldError('registerUsername', 'El usuario es requerido');
            return false;
        }

        if (username.length < 3) {
            this.showFieldError('registerUsername', 'El usuario debe tener al menos 3 caracteres');
            return false;
        }

        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            this.showFieldError('registerUsername', 'El usuario solo puede contener letras, números y guiones bajos');
            return false;
        }

        this.clearFieldError('registerUsername');
        return true;
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
     * Validar contraseña con criterios de seguridad estrictos
     */
    validatePassword(password, fieldId) {
        if (!password) {
            this.showFieldError(fieldId, 'La contraseña es requerida');
            return false;
        }

        // Validación de tipo de datos
        if (typeof password !== 'string') {
            this.showFieldError(fieldId, 'Tipo de datos inválido para contraseña');
            return false;
        }

        // Validación de longitud mínima y máxima
        if (password.length < 8) {
            this.showFieldError(fieldId, 'La contraseña debe tener al menos 8 caracteres');
            return false;
        }

        if (password.length > 128) {
            this.showFieldError(fieldId, 'La contraseña no puede exceder 128 caracteres');
            return false;
        }

        // Validación de caracteres permitidos (lista blanca)
        const allowedChars = /^[a-zA-Z0-9!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]+$/;
        if (!allowedChars.test(password)) {
            this.showFieldError(fieldId, 'La contraseña contiene caracteres no permitidos');
            return false;
        }

        // Validación de complejidad
        const hasLowercase = /[a-z]/.test(password);
        const hasUppercase = /[A-Z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChars = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password);

        let complexityScore = 0;
        if (hasLowercase) complexityScore++;
        if (hasUppercase) complexityScore++;
        if (hasNumbers) complexityScore++;
        if (hasSpecialChars) complexityScore++;

        if (complexityScore < 3) {
            this.showFieldError(fieldId, 'La contraseña debe contener al menos 3 de: mayúsculas, minúsculas, números y caracteres especiales');
            return false;
        }

        // Validación de patrones comunes débiles
        const weakPatterns = [
            /123456/,
            /password/,
            /qwerty/,
            /abc123/,
            /111111/,
            /000000/,
            /admin/,
            /user/,
            /test/
        ];

        for (const pattern of weakPatterns) {
            if (pattern.test(password.toLowerCase())) {
                this.showFieldError(fieldId, 'La contraseña contiene patrones comunes débiles');
                return false;
            }
        }

        // Validación de repetición de caracteres
        if (/(.)\1{3,}/.test(password)) {
            this.showFieldError(fieldId, 'La contraseña no puede contener más de 3 caracteres repetidos consecutivos');
            return false;
        }

        // Validación de secuencias
        const sequences = ['abcdef', '123456', 'qwerty', 'asdfgh', 'zxcvbn'];
        for (const seq of sequences) {
            if (password.toLowerCase().includes(seq)) {
                this.showFieldError(fieldId, 'La contraseña no puede contener secuencias de caracteres');
                return false;
            }
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
        console.error(`❌ Error en ${type}:`, message);
        
        const errorElement = document.getElementById(type + 'Error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.style.display = 'block';
            
            // Scroll al error
            errorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            console.error('Elemento de error no encontrado:', type + 'Error');
            alert(message);
        }
    }

    /**
     * Limpiar errores generales
     */
    clearErrors() {
        const errorElements = document.querySelectorAll('.form-error');
        errorElements.forEach(element => {
            element.style.display = 'none';
        });
    }

    /**
     * Mostrar loading
     */
    showLoading(type) {
        // Limpiar errores previos
        this.clearErrors();
        
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
            console.log('🔐 Intentando login con URL:', `${this.apiBaseUrl}/api/login`);
            console.log('📝 Datos enviados:', { email, password: password ? '***' : 'missing' });
            
            const response = await fetch(`${this.apiBaseUrl}/api/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });
            
            console.log('📡 Respuesta del servidor:', response.status, response.statusText);

            if (!response.ok) {
                console.error('❌ Error HTTP:', response.status, response.statusText);
                return { success: false, error: `Error del servidor: ${response.status}` };
            }

            const data = await response.json();
            console.log('📋 Datos de respuesta:', data);
            
            if (data.success) {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.sessionToken = data.token;
                
                console.log('✅ Login exitoso:', data.user);
                return { success: true, user: this.currentUser };
            } else {
                console.error('❌ Error en respuesta:', data.error);
                return { success: false, error: data.error || 'Error de autenticación' };
            }
        } catch (error) {
            console.error('❌ Error en login:', error);
            return { success: false, error: 'Error de conexión: ' + error.message };
        }
    }

    /**
     * Registro real con base de datos
     */
    async register(userData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            if (data.success) {
                this.isAuthenticated = true;
                this.currentUser = data.user;
                this.sessionToken = data.token;
                
                return { success: true, user: this.currentUser };
            } else {
                return { success: false, error: data.error || 'Error de registro' };
            }
        } catch (error) {
            console.error('Error en registro:', error);
            return { success: false, error: 'Error de conexión' };
        }
    }

    /**
     * Registro con confirmación por email/SMS
     */
    async registerWithConfirmation(userData) {
        try {
            const response = await fetch(`${this.apiBaseUrl}/api/register-with-confirmation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData)
            });

            const data = await response.json();
            
            if (data.success) {
                // Redirigir a la página de verificación
                const verificationUrl = `/verification.html?userId=${data.user.id}&contact=${userData.confirmationMethod === 'email' ? userData.email : userData.phone}&method=${userData.confirmationMethod}`;
                window.location.href = verificationUrl;
                
                return { success: true, user: data.user };
            } else {
                return { success: false, error: data.error || 'Error de registro' };
            }
        } catch (error) {
            console.error('Error en registro con confirmación:', error);
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
            const response = await fetch(`${this.apiBaseUrl}/api/user/profile`, {
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
            const response = await fetch(`${this.apiBaseUrl}/api/user/profile`, {
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

// Exportar para uso global
window.authManager = authManager;

console.log('🔐 Sistema de autenticación cargado'); 