module.exports = {
  apps: [{
    name: 'bingoroyal',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    cwd: '.',
    env_file: '../.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DB_HOST: process.env.DB_HOST || 'spainbingo-db.clzgxn85wdjh.eu-west-1.rds.amazonaws.com',
      DB_PORT: process.env.DB_PORT || 5432,
      DB_NAME: process.env.DB_NAME || 'spainbingo',
      DB_USERNAME: process.env.DB_USERNAME || 'spainbingo_admin',
      DB_PASSWORD: process.env.DB_PASSWORD || 'SpainBingo2024!',
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY,
      SENDGRID_FROM_EMAIL: process.env.SENDGRID_FROM_EMAIL || 'noreply@info.bingoroyal.es',
      SENDGRID_FROM_NAME: process.env.SENDGRID_FROM_NAME || 'BingoRoyal',
      SENDGRID_TEMPLATE_ID: process.env.SENDGRID_TEMPLATE_ID
    }
  }]
};
