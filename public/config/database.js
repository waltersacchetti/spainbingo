const { Sequelize } = require('sequelize');

// Configuración de base de datos
const config = {
    development: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'spainbingo',
        username: process.env.DB_USERNAME || 'spainbingo_admin',
        password: process.env.DB_PASSWORD || 'SpainBingo2024!',
        dialect: 'postgres',
        logging: console.log,
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    },
    production: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        dialect: 'postgres',
        logging: false,
        pool: {
            max: 10,
            min: 2,
            acquire: 30000,
            idle: 10000
        },
        dialectOptions: {
            ssl: {
                require: true,
                rejectUnauthorized: false
            }
        },
        define: {
            timestamps: true,
            underscored: true,
            freezeTableName: true
        }
    }
};

// Obtener configuración según entorno
const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

// Crear instancia de Sequelize
const sequelize = new Sequelize(
    dbConfig.database,
    dbConfig.username,
    dbConfig.password,
    {
        host: dbConfig.host,
        port: dbConfig.port,
        dialect: dbConfig.dialect,
        logging: dbConfig.logging,
        pool: dbConfig.pool,
        dialectOptions: dbConfig.dialectOptions,
        define: dbConfig.define
    }
);

// Función para probar conexión
const testConnection = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a base de datos establecida correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al conectar con la base de datos:', error.message);
        return false;
    }
};

// Función para sincronizar modelos
const syncDatabase = async (force = false) => {
    try {
        await sequelize.sync({ force });
        console.log('✅ Base de datos sincronizada correctamente');
        return true;
    } catch (error) {
        console.error('❌ Error al sincronizar base de datos:', error.message);
        return false;
    }
};

// Función para cerrar conexión
const closeConnection = async () => {
    try {
        await sequelize.close();
        console.log('✅ Conexión a base de datos cerrada correctamente');
    } catch (error) {
        console.error('❌ Error al cerrar conexión:', error.message);
    }
};

module.exports = {
    sequelize,
    testConnection,
    syncDatabase,
    closeConnection,
    config: dbConfig
}; 