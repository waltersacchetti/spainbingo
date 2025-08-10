/**
 * Gestor Mejorado de Usuarios
 * Integra caché y funcionalidades avanzadas de registro
 */

const bcrypt = require('bcrypt');
const { v4: uuidv4 } = require('uuid');
const { sequelize } = require('../config/database');
const User = require('./User')(sequelize);
const userCache = require('./UserCache');
const VerificationService = require('../services/VerificationService');

class UserManager {
    constructor() {
        this.verificationService = new VerificationService();
        this.registrationAttempts = new Map();
        this.maxRegistrationAttempts = 5;
        this.registrationCooldown = 15 * 60 * 1000; // 15 minutos
        this.passwordMinLength = 8;
        this.passwordMaxLength = 128;
        
        console.log('👥 Gestor de usuarios inicializado');
    }

    /**
     * Validar datos de registro
     */
    validateRegistrationData(userData) {
        const errors = [];

        // Validar username
        if (!userData.username || userData.username.length < 3 || userData.username.length > 50) {
            errors.push('El nombre de usuario debe tener entre 3 y 50 caracteres');
        }
        if (!/^[a-zA-Z0-9_]+$/.test(userData.username)) {
            errors.push('El nombre de usuario solo puede contener letras, números y guiones bajos');
        }

        // Validar email
        if (!userData.email || !this.isValidEmail(userData.email)) {
            errors.push('Email inválido');
        }

        // Validar password
        if (!userData.password || userData.password.length < this.passwordMinLength) {
            errors.push(`La contraseña debe tener al menos ${this.passwordMinLength} caracteres`);
        }
        if (userData.password.length > this.passwordMaxLength) {
            errors.push(`La contraseña no puede exceder ${this.passwordMaxLength} caracteres`);
        }
        if (!this.isStrongPassword(userData.password)) {
            errors.push('La contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial');
        }

        // Validar fecha de nacimiento (obligatoria)
        if (!userData.dateOfBirth) {
            errors.push('La fecha de nacimiento es obligatoria');
        } else {
            const age = this.calculateAge(userData.dateOfBirth);
            if (age < 18) {
                errors.push('Debes ser mayor de 18 años para registrarte');
            }
        }

        // Validar teléfono (obligatorio)
        if (!userData.phone) {
            errors.push('El número de teléfono es obligatorio');
        } else if (!this.isValidPhone(userData.phone)) {
            errors.push('Por favor, introduce un número de teléfono válido (+34 600 000 000)');
        }

        // Validar método de verificación
        if (!userData.verificationMethod || !['email', 'sms'].includes(userData.verificationMethod)) {
            errors.push('Debes seleccionar un método de verificación');
        }

        // Validar datos personales
        if (userData.first_name && userData.first_name.length > 50) {
            errors.push('El nombre no puede exceder 50 caracteres');
        }
        if (userData.last_name && userData.last_name.length > 50) {
            errors.push('El apellido no puede exceder 50 caracteres');
        }

        return errors;
    }

    /**
     * Verificar si el email es válido
     */
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    /**
     * Verificar si la contraseña es fuerte
     */
    isStrongPassword(password) {
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
        
        return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar;
    }

    /**
     * Verificar si el teléfono es válido (formato español)
     */
    isValidPhone(phone) {
        const phoneRegex = /^(\+34|0034)?[6-9]\d{8}$/;
        return phoneRegex.test(phone.replace(/\s/g, ''));
    }

    /**
     * Calcular edad
     */
    calculateAge(dateOfBirth) {
        const today = new Date();
        const birthDate = new Date(dateOfBirth);
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        
        return age;
    }

    /**
     * Verificar intentos de registro
     */
    checkRegistrationAttempts(ip) {
        const attempts = this.registrationAttempts.get(ip);
        
        if (!attempts) {
            return { allowed: true, remainingAttempts: this.maxRegistrationAttempts };
        }

        const timeSinceLastAttempt = Date.now() - attempts.lastAttempt;
        
        if (timeSinceLastAttempt < this.registrationCooldown) {
            const remainingTime = Math.ceil((this.registrationCooldown - timeSinceLastAttempt) / 60000);
            return { 
                allowed: false, 
                remainingTime,
                message: `Demasiados intentos. Intenta de nuevo en ${remainingTime} minutos`
            };
        }

        // Resetear intentos si ya pasó el tiempo de cooldown
        this.registrationAttempts.delete(ip);
        return { allowed: true, remainingAttempts: this.maxRegistrationAttempts };
    }

    /**
     * Registrar intento de registro
     */
    recordRegistrationAttempt(ip) {
        const attempts = this.registrationAttempts.get(ip) || { count: 0, lastAttempt: 0 };
        attempts.count++;
        attempts.lastAttempt = Date.now();
        this.registrationAttempts.set(ip, attempts);
    }

    /**
     * Registrar nuevo usuario
     */
    async registerUser(userData, ip) {
        try {
            // Verificar intentos de registro
            const attemptCheck = this.checkRegistrationAttempts(ip);
            if (!attemptCheck.allowed) {
                return {
                    success: false,
                    error: attemptCheck.message
                };
            }

            // Validar datos
            const validationErrors = this.validateRegistrationData(userData);
            if (validationErrors.length > 0) {
                this.recordRegistrationAttempt(ip);
                return {
                    success: false,
                    error: validationErrors.join(', ')
                };
            }

            // Verificar si el usuario ya existe
            const existingUser = await this.findUserByEmailOrUsername(userData.email, userData.username);
            if (existingUser) {
                this.recordRegistrationAttempt(ip);
                return {
                    success: false,
                    error: existingUser.email === userData.email ? 'El email ya está registrado' : 'El nombre de usuario ya está en uso'
                };
            }

            // Crear hash de la contraseña
            const saltRounds = 12;
            const passwordHash = await bcrypt.hash(userData.password, saltRounds);

            // Preparar datos del usuario
            const newUserData = {
                username: userData.username.toLowerCase(),
                email: userData.email.toLowerCase(),
                password_hash: passwordHash,
                first_name: userData.first_name || null,
                last_name: userData.last_name || null,
                date_of_birth: userData.dateOfBirth || null,
                phone: userData.phone || null,
                verification_method: userData.verificationMethod || 'email',
                marketing_consent: userData.marketingConsent || false,
                country: userData.country || 'Spain',
                city: userData.city || null,
                postal_code: userData.postal_code || null,
                is_verified: false,
                is_active: true,
                balance: 0.00,
                total_wagered: 0.00,
                total_won: 0.00
            };

            // Crear usuario en la base de datos
            const user = await User.create(newUserData);

            // Guardar en caché
            userCache.setCachedUser(user.id, user.toJSON());

            // Limpiar intentos de registro
            this.registrationAttempts.delete(ip);

            console.log(`✅ Usuario registrado exitosamente: ${user.username} (ID: ${user.id})`);

            return {
                success: true,
                user: user.getPublicInfo(),
                message: 'Usuario registrado exitosamente'
            };

        } catch (error) {
            console.error('❌ Error al registrar usuario:', error);
            this.recordRegistrationAttempt(ip);
            
            // Manejar errores específicos de PostgreSQL
            if (error.code === '23505') {
                // Violación de restricción de unicidad
                if (error.constraint === 'users_username_key') {
                    return {
                        success: false,
                        error: 'El nombre de usuario ya está en uso'
                    };
                } else if (error.constraint === 'users_email_key') {
                    return {
                        success: false,
                        error: 'El email ya está registrado'
                    };
                } else if (error.detail && error.detail.includes('username')) {
                    return {
                        success: false,
                        error: 'El nombre de usuario ya está en uso'
                    };
                } else if (error.detail && error.detail.includes('email')) {
                    return {
                        success: false,
                        error: 'El email ya está registrado'
                    };
                }
            }
            
            return {
                success: false,
                error: 'Error interno del servidor'
            };
        }
    }

    /**
     * Buscar usuario por email o username
     */
    async findUserByEmailOrUsername(email, username) {
        try {
            // Buscar en caché primero
            const cachedByEmail = userCache.findUserByEmail(email);
            if (cachedByEmail) return cachedByEmail;

            const cachedByUsername = userCache.findUserByUsername(username);
            if (cachedByUsername) return cachedByUsername;

            // Buscar en base de datos
            const user = await User.findOne({
                where: {
                    [sequelize.Op.or]: [
                        { email: email.toLowerCase() },
                        { username: username.toLowerCase() }
                    ]
                }
            });

            if (user) {
                userCache.setCachedUser(user.id, user.toJSON());
            }

            return user;

        } catch (error) {
            console.error('Error al buscar usuario:', error);
            return null;
        }
    }

    /**
     * Obtener usuario por ID con caché
     */
    async getUserById(userId) {
        try {
            // Buscar en caché primero
            const cachedUser = userCache.getCachedUser(userId);
            if (cachedUser) return cachedUser;

            // Buscar en base de datos
            const user = await User.findByPk(userId);
            
            if (user) {
                userCache.setCachedUser(userId, user.toJSON());
            }

            return user;

        } catch (error) {
            console.error('Error al obtener usuario por ID:', error);
            return null;
        }
    }

    /**
     * Actualizar usuario
     */
    async updateUser(userId, updateData) {
        try {
            const user = await User.findByPk(userId);
            if (!user) {
                return { success: false, error: 'Usuario no encontrado' };
            }

            // Actualizar en base de datos
            await user.update(updateData);

            // Actualizar caché
            userCache.updateCachedUser(userId, user.toJSON());

            console.log(`🔄 Usuario actualizado: ${user.username} (ID: ${userId})`);

            return {
                success: true,
                user: user.getPublicInfo()
            };

        } catch (error) {
            console.error('Error al actualizar usuario:', error);
            return { success: false, error: 'Error interno del servidor' };
        }
    }

    /**
     * Verificar contraseña
     */
    async verifyPassword(userId, password) {
        try {
            const user = await this.getUserById(userId);
            if (!user) return false;

            return await bcrypt.compare(password, user.password_hash);

        } catch (error) {
            console.error('Error al verificar contraseña:', error);
            return false;
        }
    }

    /**
     * Cambiar contraseña
     */
    async changePassword(userId, currentPassword, newPassword) {
        try {
            // Verificar contraseña actual
            const isCurrentPasswordValid = await this.verifyPassword(userId, currentPassword);
            if (!isCurrentPasswordValid) {
                return { success: false, error: 'Contraseña actual incorrecta' };
            }

            // Validar nueva contraseña
            if (!this.isStrongPassword(newPassword)) {
                return { 
                    success: false, 
                    error: 'La nueva contraseña debe contener al menos una mayúscula, una minúscula, un número y un carácter especial' 
                };
            }

            // Crear hash de la nueva contraseña
            const saltRounds = 12;
            const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

            // Actualizar contraseña
            const result = await this.updateUser(userId, { password_hash: newPasswordHash });

            if (result.success) {
                console.log(`🔐 Contraseña cambiada para usuario ID: ${userId}`);
            }

            return result;

        } catch (error) {
            console.error('Error al cambiar contraseña:', error);
            return { success: false, error: 'Error interno del servidor' };
        }
    }

    /**
     * Obtener estadísticas de usuarios
     */
    async getUserStats() {
        try {
            const stats = await User.findAll({
                attributes: [
                    [sequelize.fn('COUNT', sequelize.col('id')), 'total_users'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_verified = true THEN 1 END')), 'verified_users'],
                    [sequelize.fn('COUNT', sequelize.literal('CASE WHEN is_active = true THEN 1 END')), 'active_users'],
                    [sequelize.fn('SUM', sequelize.col('balance')), 'total_balance'],
                    [sequelize.fn('SUM', sequelize.col('total_wagered')), 'total_wagered'],
                    [sequelize.fn('SUM', sequelize.col('total_won')), 'total_won']
                ],
                raw: true
            });

            return stats[0];

        } catch (error) {
            console.error('Error al obtener estadísticas de usuarios:', error);
            return null;
        }
    }

    /**
     * Obtener usuarios recientes
     */
    async getRecentUsers(limit = 10) {
        try {
            const users = await User.findAll({
                order: [['created_at', 'DESC']],
                limit: limit,
                attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_verified', 'is_active', 'balance', 'created_at']
            });

            return users.map(user => user.toJSON());

        } catch (error) {
            console.error('Error al obtener usuarios recientes:', error);
            return [];
        }
    }

    /**
     * Obtener usuarios con mayor balance
     */
    async getTopUsers(limit = 10) {
        try {
            const users = await User.findAll({
                order: [['balance', 'DESC']],
                limit: limit,
                attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'balance', 'total_wagered', 'total_won']
            });

            return users.map(user => user.toJSON());

        } catch (error) {
            console.error('Error al obtener usuarios top:', error);
            return [];
        }
    }

    /**
     * Limpiar caché de usuario
     */
    clearUserCache(userId) {
        userCache.removeCachedUser(userId);
    }

    /**
     * Obtener estadísticas del caché
     */
    getCacheStats() {
        return userCache.getCacheStats();
    }

    /**
     * Enviar código de verificación
     */
    async sendVerificationCode(userId, method) {
        try {
            // Obtener datos del usuario
            const user = await User.findByPk(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'Usuario no encontrado'
                };
            }

            if (method === 'email') {
                return await this.verificationService.sendVerificationCode(userId, user.email, user.username);
            } else if (method === 'sms') {
                return await this.verificationService.sendVerificationSMS(userId, user.phone || user.telefono);
            } else {
                return {
                    success: false,
                    error: 'Método de verificación inválido'
                };
            }
        } catch (error) {
            console.error('Error al enviar código de verificación:', error);
            return {
                success: false,
                error: 'Error interno del servidor'
            };
        }
    }

    /**
     * Verificar código de verificación
     */
    async verifyCode(userId, code) {
        try {
            // Obtener datos del usuario
            const user = await User.findByPk(userId);
            if (!user) {
                return {
                    success: false,
                    error: 'Usuario no encontrado'
                };
            }

            const isValid = this.verificationService.verifyCode(userId, user.email, code);
            
            if (isValid) {
                // Activar usuario
                await User.update(
                    { 
                        is_verified: true,
                        email_verified: true,
                        email_verified_at: new Date()
                    },
                    { where: { id: userId } }
                );

                // Enviar email de bienvenida
                await this.verificationService.emailService.sendWelcomeEmail(user.email, user.username);

                return {
                    success: true,
                    message: 'Código verificado correctamente'
                };
            } else {
                return {
                    success: false,
                    error: 'Código inválido o expirado'
                };
            }
        } catch (error) {
            console.error('Error al verificar código:', error);
            return {
                success: false,
                error: 'Error interno del servidor'
            };
        }
    }

    /**
     * Limpiar códigos expirados
     */
    async cleanExpiredCodes() {
        this.verificationService.cleanupExpiredCodes();
        return { success: true, message: 'Códigos expirados limpiados' };
    }
}

module.exports = new UserManager(); 