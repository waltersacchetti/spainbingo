# 🗄️ Base de Datos SpainBingo

## 📋 Descripción General

SpainBingo utiliza **PostgreSQL** como base de datos principal, desplegada en **Amazon RDS** para garantizar alta disponibilidad, escalabilidad y seguridad.

## 🏗️ Arquitectura

### **Componentes**
- **Amazon RDS PostgreSQL 15.4**: Base de datos principal
- **Sequelize ORM**: Mapeo objeto-relacional
- **Connection Pooling**: Gestión eficiente de conexiones
- **SSL/TLS**: Encriptación en tránsito
- **Backup Automático**: Retención de 7 días

### **Especificaciones Técnicas**
- **Instancia**: db.t3.micro (desarrollo) / db.t3.small (producción)
- **Almacenamiento**: 20GB GP2 SSD
- **Conexiones**: Máximo 10 concurrentes
- **Puerto**: 5432 (PostgreSQL estándar)

## 🚀 Configuración Inicial

### **Paso 1: Crear Base de Datos en AWS**
```bash
# Ejecutar script de configuración
./setup-database.sh
```

**Este script crea:**
- ✅ Instancia RDS PostgreSQL
- ✅ Subnet Group
- ✅ Security Group
- ✅ Parameter Group
- ✅ Esquema de base de datos

### **Paso 2: Configurar Cliente PostgreSQL en EC2**
```bash
# Instalar y configurar cliente PostgreSQL
./setup-postgres-client.sh
```

**Este script:**
- ✅ Instala PostgreSQL client
- ✅ Prueba conexión
- ✅ Ejecuta esquema
- ✅ Crea configuración

## 📊 Esquema de Base de Datos

### **Tabla: users**
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    date_of_birth DATE,
    phone VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Spain',
    city VARCHAR(50),
    postal_code VARCHAR(10),
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    self_exclusion BOOLEAN DEFAULT FALSE,
    self_exclusion_until DATE,
    balance DECIMAL(10,2) DEFAULT 0.00,
    total_wagered DECIMAL(10,2) DEFAULT 0.00,
    total_won DECIMAL(10,2) DEFAULT 0.00,
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabla: sessions**
```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabla: transactions**
```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'bonus', 'game_win', 'game_loss')),
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### **Tabla: bingo_cards**
```sql
CREATE TABLE bingo_cards (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    card_numbers INTEGER[][] NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    game_id VARCHAR(50)
);
```

### **Tabla: games**
```sql
CREATE TABLE games (
    id SERIAL PRIMARY KEY,
    game_type VARCHAR(20) DEFAULT 'bingo',
    status VARCHAR(20) DEFAULT 'waiting' CHECK (status IN ('waiting', 'active', 'finished')),
    called_numbers INTEGER[],
    winner_user_id INTEGER REFERENCES users(id),
    prize_amount DECIMAL(10,2),
    started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    finished_at TIMESTAMP
);
```

### **Tabla: audit_log**
```sql
CREATE TABLE audit_log (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 🔧 Configuración de Conexión

### **Variables de Entorno**
```bash
# Producción
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=spainbingo
DB_USERNAME=spainbingo_admin
DB_PASSWORD=SpainBingo2024!
NODE_ENV=production

# Desarrollo
DB_HOST=localhost
DB_PORT=5432
DB_NAME=spainbingo
DB_USERNAME=spainbingo_admin
DB_PASSWORD=SpainBingo2024!
NODE_ENV=development
```

### **Archivo de Configuración**
```javascript
// config/database.js
const config = {
    development: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'spainbingo',
        username: process.env.DB_USERNAME || 'spainbingo_admin',
        password: process.env.DB_PASSWORD || 'SpainBingo2024!',
        dialect: 'postgres',
        logging: console.log,
        pool: { max: 5, min: 0, acquire: 30000, idle: 10000 }
    },
    production: {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        dialect: 'postgres',
        logging: false,
        pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
        ssl: { require: true, rejectUnauthorized: false }
    }
};
```

## 🛡️ Seguridad

### **Medidas Implementadas**
- **Encriptación en Tránsito**: SSL/TLS obligatorio
- **Encriptación en Reposo**: AES-256
- **Contraseñas Hasheadas**: bcrypt con salt de 12 rondas
- **Validación de Entrada**: Express-validator
- **Auditoría Completa**: Log de todas las acciones
- **Auto-exclusión**: Sistema de juego responsable

### **Validaciones de Usuario**
- **Edad Mínima**: 18 años
- **Email Único**: Validación de formato
- **Username Único**: Solo caracteres alfanuméricos y guiones bajos
- **Contraseña Fuerte**: Mínimo 8 caracteres, mayúsculas, minúsculas, números

## 📈 Monitoreo y Mantenimiento

### **Métricas Clave**
- **Conexiones Activas**: Máximo 10 concurrentes
- **Tiempo de Respuesta**: < 100ms promedio
- **Uptime**: 99.9% objetivo
- **Backup**: Diario automático

### **Comandos de Mantenimiento**
```bash
# Probar conexión
node -e "require('./config/database').testConnection()"

# Sincronizar modelos
node -e "require('./config/database').syncDatabase()"

# Verificar estado RDS
aws rds describe-db-instances --db-instance-identifier spainbingo-db

# Ver logs de conexión
aws logs describe-log-groups --log-group-name-prefix /aws/rds/instance/spainbingo-db
```

## 🔄 Migraciones y Actualizaciones

### **Crear Nueva Migración**
```bash
# Crear archivo de migración
npx sequelize-cli migration:generate --name add_new_field

# Ejecutar migraciones
npx sequelize-cli db:migrate

# Revertir migración
npx sequelize-cli db:migrate:undo
```

### **Actualizar Esquema**
```bash
# Sincronizar modelos (desarrollo)
node -e "require('./config/database').syncDatabase(true)"

# Ejecutar script SQL personalizado
psql -h $DB_HOST -p $DB_PORT -U $DB_USERNAME -d $DB_NAME -f migration.sql
```

## 🚨 Resolución de Problemas

### **Errores Comunes**

#### **Error de Conexión**
```bash
# Verificar endpoint
aws rds describe-db-instances --db-instance-identifier spainbingo-db --query 'DBInstances[0].Endpoint'

# Probar conectividad
telnet your-endpoint 5432

# Verificar Security Group
aws ec2 describe-security-groups --group-ids sg-xxxxxxxxx
```

#### **Error de Autenticación**
```bash
# Verificar credenciales
aws rds describe-db-instances --db-instance-identifier spainbingo-db --query 'DBInstances[0].MasterUsername'

# Resetear contraseña
aws rds modify-db-instance --db-instance-identifier spainbingo-db --master-user-password newpassword
```

#### **Error de SSL**
```bash
# Verificar certificado SSL
openssl s_client -connect your-endpoint:5432 -servername your-endpoint

# Configurar SSL en aplicación
ssl: { require: true, rejectUnauthorized: false }
```

## 📚 Recursos Adicionales

### **Documentación AWS**
- [Amazon RDS PostgreSQL](https://docs.aws.amazon.com/rds/latest/userguide/CHAP_PostgreSQL.html)
- [RDS Security](https://docs.aws.amazon.com/rds/latest/userguide/UsingWithRDS.html)
- [RDS Monitoring](https://docs.aws.amazon.com/rds/latest/userguide/MonitoringOverview.html)

### **Documentación Sequelize**
- [Sequelize Getting Started](https://sequelize.org/docs/v6/getting-started/)
- [Sequelize Models](https://sequelize.org/docs/v6/core-concepts/model-basics/)
- [Sequelize Migrations](https://sequelize.org/docs/v6/other-topics/migrations/)

### **PostgreSQL**
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Security](https://www.postgresql.org/docs/current/security.html)
- [PostgreSQL Performance](https://www.postgresql.org/docs/current/performance.html) 