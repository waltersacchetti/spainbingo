#!/usr/bin/env node

/**
 * Script de Gestión de Usuarios
 * Permite verificar, listar y gestionar usuarios desde la línea de comandos
 */

const path = require('path');
const { Sequelize } = require('sequelize');

// Configurar la base de datos
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: 'spainbingo-db.clzgxn85wdjh.eu-west-1.rds.amazonaws.com',
    port: 5432,
    database: 'spainbingo',
    username: 'spainbingo_admin',
    password: 'SpainBingo2024!',
    logging: false,
    pool: {
        max: 5,
        min: 0,
        acquire: 30000,
        idle: 10000
    }
});

// Importar modelos
const User = require('../models/User');
const UserManager = require('../models/UserManager');
const userCache = require('../models/UserCache');

class UserManagementCLI {
    constructor() {
        this.userManager = UserManager;
    }

    /**
     * Mostrar ayuda
     */
    showHelp() {
        console.log(`
🎰 GESTOR DE USUARIOS - SPAIN BINGO

Uso: node user-management.js [comando] [opciones]

COMANDOS DISPONIBLES:

📊 ESTADÍSTICAS:
  stats                    - Mostrar estadísticas generales
  list                     - Listar todos los usuarios
  recent [limite]          - Mostrar usuarios recientes (default: 10)
  top [limite]             - Mostrar usuarios con mayor balance (default: 10)

🔍 BÚSQUEDA:
  find <email|username>    - Buscar usuario por email o username
  get <id>                 - Obtener usuario por ID

👤 GESTIÓN:
  create                   - Crear nuevo usuario (interactivo)
  update <id>              - Actualizar usuario (interactivo)
  delete <id>              - Eliminar usuario
  verify <id>              - Verificar usuario
  deactivate <id>          - Desactivar usuario
  activate <id>            - Activar usuario

💰 FINANCIERO:
  balance <id> <amount>    - Ajustar balance de usuario
  add-money <id> <amount>  - Agregar dinero al balance
  remove-money <id> <amount> - Quitar dinero del balance

🗄️ CACHÉ:
  cache-stats              - Mostrar estadísticas del caché
  cache-clear              - Limpiar todo el caché
  cache-clear-user <id>    - Limpiar caché de usuario específico

🔧 MANTENIMIENTO:
  backup                   - Crear backup de usuarios
  cleanup                  - Limpiar usuarios inactivos
  validate                 - Validar integridad de datos

EJEMPLOS:
  node user-management.js stats
  node user-management.js list
  node user-management.js find test@spainbingo.es
  node user-management.js get 1
  node user-management.js recent 5
  node user-management.js top 10
  node user-management.js cache-stats
        `);
    }

    /**
     * Conectar a la base de datos
     */
    async connect() {
        try {
            await sequelize.authenticate();
            console.log('✅ Conexión a la base de datos establecida');
            return true;
        } catch (error) {
            console.error('❌ Error al conectar a la base de datos:', error.message);
            return false;
        }
    }

    /**
     * Mostrar estadísticas generales
     */
    async showStats() {
        try {
            console.log('\n📊 ESTADÍSTICAS GENERALES');
            console.log('=' .repeat(50));

            const stats = await this.userManager.getUserStats();
            
            if (stats) {
                console.log(`👥 Total de usuarios: ${stats.total_users || 0}`);
                console.log(`✅ Usuarios verificados: ${stats.verified_users || 0}`);
                console.log(`🟢 Usuarios activos: ${stats.active_users || 0}`);
                console.log(`💰 Balance total: €${parseFloat(stats.total_balance || 0).toFixed(2)}`);
                console.log(`🎲 Total apostado: €${parseFloat(stats.total_wagered || 0).toFixed(2)}`);
                console.log(`🏆 Total ganado: €${parseFloat(stats.total_won || 0).toFixed(2)}`);
            }

            // Estadísticas del caché
            const cacheStats = this.userManager.getCacheStats();
            console.log('\n🗄️ ESTADÍSTICAS DEL CACHÉ');
            console.log('=' .repeat(30));
            console.log(`📦 Usuarios en caché: ${cacheStats.userCacheSize}`);
            console.log(`🔐 Sesiones en caché: ${cacheStats.sessionCacheSize}`);
            console.log(`💾 Memoria usada: ${Math.round(cacheStats.memoryUsage.heapUsed / 1024 / 1024)}MB`);

        } catch (error) {
            console.error('❌ Error al obtener estadísticas:', error.message);
        }
    }

    /**
     * Listar todos los usuarios
     */
    async listUsers() {
        try {
            console.log('\n👥 LISTA DE USUARIOS');
            console.log('=' .repeat(100));

            const users = await User.findAll({
                order: [['created_at', 'DESC']],
                attributes: ['id', 'username', 'email', 'first_name', 'last_name', 'is_verified', 'is_active', 'balance', 'created_at']
            });

            if (users.length === 0) {
                console.log('No hay usuarios registrados');
                return;
            }

            console.log('ID  | Username    | Email                    | Nombre           | Verif. | Activo | Balance  | Fecha Registro');
            console.log('----|-------------|--------------------------|------------------|--------|--------|----------|------------------');

            users.forEach(user => {
                const verified = user.is_verified ? '✅' : '❌';
                const active = user.is_active ? '🟢' : '🔴';
                const balance = `€${parseFloat(user.balance || 0).toFixed(2)}`;
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-';
                const date = new Date(user.created_at).toLocaleDateString('es-ES');
                
                console.log(`${user.id.toString().padStart(3)} | ${user.username.padEnd(11)} | ${user.email.padEnd(24)} | ${name.padEnd(16)} | ${verified}     | ${active}     | ${balance.padStart(8)} | ${date}`);
            });

            console.log(`\nTotal: ${users.length} usuarios`);

        } catch (error) {
            console.error('❌ Error al listar usuarios:', error.message);
        }
    }

    /**
     * Mostrar usuarios recientes
     */
    async showRecentUsers(limit = 10) {
        try {
            console.log(`\n🆕 USUARIOS RECIENTES (últimos ${limit})`);
            console.log('=' .repeat(80));

            const users = await this.userManager.getRecentUsers(parseInt(limit));

            if (users.length === 0) {
                console.log('No hay usuarios recientes');
                return;
            }

            users.forEach((user, index) => {
                const verified = user.is_verified ? '✅' : '❌';
                const active = user.is_active ? '🟢' : '🔴';
                const balance = `€${parseFloat(user.balance || 0).toFixed(2)}`;
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-';
                const date = new Date(user.created_at).toLocaleString('es-ES');
                
                console.log(`${index + 1}. ${user.username} (${user.email})`);
                console.log(`   Nombre: ${name} | Verificado: ${verified} | Activo: ${active} | Balance: ${balance}`);
                console.log(`   Registrado: ${date}`);
                console.log('');
            });

        } catch (error) {
            console.error('❌ Error al obtener usuarios recientes:', error.message);
        }
    }

    /**
     * Mostrar usuarios top
     */
    async showTopUsers(limit = 10) {
        try {
            console.log(`\n🏆 USUARIOS CON MAYOR BALANCE (top ${limit})`);
            console.log('=' .repeat(80));

            const users = await this.userManager.getTopUsers(parseInt(limit));

            if (users.length === 0) {
                console.log('No hay usuarios');
                return;
            }

            users.forEach((user, index) => {
                const balance = `€${parseFloat(user.balance || 0).toFixed(2)}`;
                const wagered = `€${parseFloat(user.total_wagered || 0).toFixed(2)}`;
                const won = `€${parseFloat(user.total_won || 0).toFixed(2)}`;
                const name = `${user.first_name || ''} ${user.last_name || ''}`.trim() || '-';
                
                console.log(`${index + 1}. ${user.username} (${user.email})`);
                console.log(`   Nombre: ${name}`);
                console.log(`   Balance: ${balance} | Apostado: ${wagered} | Ganado: ${won}`);
                console.log('');
            });

        } catch (error) {
            console.error('❌ Error al obtener usuarios top:', error.message);
        }
    }

    /**
     * Buscar usuario
     */
    async findUser(searchTerm) {
        try {
            console.log(`\n🔍 BUSCANDO: "${searchTerm}"`);
            console.log('=' .repeat(50));

            const user = await this.userManager.findUserByEmailOrUsername(searchTerm, searchTerm);

            if (!user) {
                console.log('❌ Usuario no encontrado');
                return;
            }

            this.displayUserDetails(user);

        } catch (error) {
            console.error('❌ Error al buscar usuario:', error.message);
        }
    }

    /**
     * Obtener usuario por ID
     */
    async getUserById(id) {
        try {
            console.log(`\n👤 USUARIO ID: ${id}`);
            console.log('=' .repeat(50));

            const user = await this.userManager.getUserById(parseInt(id));

            if (!user) {
                console.log('❌ Usuario no encontrado');
                return;
            }

            this.displayUserDetails(user);

        } catch (error) {
            console.error('❌ Error al obtener usuario:', error.message);
        }
    }

    /**
     * Mostrar detalles de usuario
     */
    displayUserDetails(user) {
        const verified = user.is_verified ? '✅' : '❌';
        const active = user.is_active ? '🟢' : '🔴';
        const selfExcluded = user.self_exclusion ? '🔒' : '🔓';
        const balance = `€${parseFloat(user.balance || 0).toFixed(2)}`;
        const wagered = `€${parseFloat(user.total_wagered || 0).toFixed(2)}`;
        const won = `€${parseFloat(user.total_won || 0).toFixed(2)}`;
        const created = new Date(user.created_at).toLocaleString('es-ES');
        const updated = new Date(user.updated_at).toLocaleString('es-ES');
        const lastLogin = user.last_login ? new Date(user.last_login).toLocaleString('es-ES') : 'Nunca';

        console.log(`👤 ID: ${user.id}`);
        console.log(`📝 Username: ${user.username}`);
        console.log(`📧 Email: ${user.email}`);
        console.log(`👨‍💼 Nombre: ${user.first_name || '-'} ${user.last_name || '-'}`);
        console.log(`📅 Fecha de nacimiento: ${user.date_of_birth || '-'}`);
        console.log(`📞 Teléfono: ${user.phone || '-'}`);
        console.log(`🌍 País: ${user.country || '-'}`);
        console.log(`🏙️ Ciudad: ${user.city || '-'}`);
        console.log(`📮 Código postal: ${user.postal_code || '-'}`);
        console.log('');
        console.log(`✅ Verificado: ${verified}`);
        console.log(`🟢 Activo: ${active}`);
        console.log(`🔒 Auto-exclusión: ${selfExcluded}`);
        if (user.self_exclusion_until) {
            console.log(`📅 Auto-exclusión hasta: ${new Date(user.self_exclusion_until).toLocaleDateString('es-ES')}`);
        }
        console.log('');
        console.log(`💰 Balance: ${balance}`);
        console.log(`🎲 Total apostado: ${wagered}`);
        console.log(`🏆 Total ganado: ${won}`);
        console.log('');
        console.log(`📅 Registrado: ${created}`);
        console.log(`🔄 Última actualización: ${updated}`);
        console.log(`🔐 Último login: ${lastLogin}`);
    }

    /**
     * Mostrar estadísticas del caché
     */
    showCacheStats() {
        try {
            console.log('\n🗄️ ESTADÍSTICAS DEL CACHÉ');
            console.log('=' .repeat(40));

            const stats = this.userManager.getCacheStats();
            
            console.log(`📦 Usuarios en caché: ${stats.userCacheSize}`);
            console.log(`🔐 Sesiones en caché: ${stats.sessionCacheSize}`);
            console.log(`📊 Tamaño máximo: ${stats.maxCacheSize}`);
            console.log(`⏰ Expiración caché: ${Math.round(stats.cacheExpiry / 60000)} minutos`);
            console.log(`⏰ Expiración sesiones: ${Math.round(stats.sessionExpiry / 60000)} minutos`);
            console.log('');
            console.log('💾 USO DE MEMORIA:');
            console.log(`   Heap usado: ${Math.round(stats.memoryUsage.heapUsed / 1024 / 1024)}MB`);
            console.log(`   Heap total: ${Math.round(stats.memoryUsage.heapTotal / 1024 / 1024)}MB`);
            console.log(`   Memoria externa: ${Math.round(stats.memoryUsage.external / 1024 / 1024)}MB`);
            console.log(`   RSS: ${Math.round(stats.memoryUsage.rss / 1024 / 1024)}MB`);

        } catch (error) {
            console.error('❌ Error al obtener estadísticas del caché:', error.message);
        }
    }

    /**
     * Limpiar caché
     */
    clearCache() {
        try {
            console.log('\n🧹 LIMPIANDO CACHÉ...');
            userCache.clearAllCache();
            console.log('✅ Caché limpiado exitosamente');

        } catch (error) {
            console.error('❌ Error al limpiar caché:', error.message);
        }
    }

    /**
     * Ejecutar comando
     */
    async run() {
        const args = process.argv.slice(2);
        const command = args[0];

        if (!command || command === 'help' || command === '-h' || command === '--help') {
            this.showHelp();
            return;
        }

        // Conectar a la base de datos
        const connected = await this.connect();
        if (!connected) {
            process.exit(1);
        }

        try {
            switch (command) {
                case 'stats':
                    await this.showStats();
                    break;

                case 'list':
                    await this.listUsers();
                    break;

                case 'recent':
                    const recentLimit = args[1] || 10;
                    await this.showRecentUsers(recentLimit);
                    break;

                case 'top':
                    const topLimit = args[1] || 10;
                    await this.showTopUsers(topLimit);
                    break;

                case 'find':
                    if (!args[1]) {
                        console.log('❌ Debes especificar un email o username para buscar');
                        return;
                    }
                    await this.findUser(args[1]);
                    break;

                case 'get':
                    if (!args[1]) {
                        console.log('❌ Debes especificar un ID de usuario');
                        return;
                    }
                    await this.getUserById(args[1]);
                    break;

                case 'cache-stats':
                    this.showCacheStats();
                    break;

                case 'cache-clear':
                    this.clearCache();
                    break;

                default:
                    console.log(`❌ Comando desconocido: ${command}`);
                    this.showHelp();
                    break;
            }

        } catch (error) {
            console.error('❌ Error:', error.message);
        } finally {
            await sequelize.close();
        }
    }
}

// Ejecutar el CLI
if (require.main === module) {
    const cli = new UserManagementCLI();
    cli.run().catch(console.error);
}

module.exports = UserManagementCLI; 