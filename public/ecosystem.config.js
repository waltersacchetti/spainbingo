module.exports = {
  apps: [{
    name: 'spainbingo',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    cwd: '/home/ec2-user/public',
    env_file: '/home/ec2-user/.env',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DB_HOST: 'spainbingo-db.clzgxn85wdjh.eu-west-1.rds.amazonaws.com',
      DB_PORT: 5432,
      DB_NAME: 'spainbingo',
      DB_USERNAME: 'spainbingo_admin',
      DB_PASSWORD: 'SpainBingo2024!', // Hardcoded for now
      SENDGRID_API_KEY: process.env.SENDGRID_API_KEY || '', // From environment variable
      SENDGRID_FROM_EMAIL: 'noreply@em438.bingoroyal.es',
      SENDGRID_FROM_NAME: 'BingoRoyal',
      SENDGRID_TEMPLATE_ID: 'd-verification-template-id',
      // Gmail como alternativa temporal
      GMAIL_USER: 'bingoroyal@gmail.com',
      GMAIL_APP_PASSWORD: 'YOUR_GMAIL_APP_PASSWORD',
      GMAIL_FROM_EMAIL: 'bingoroyal@gmail.com',
      GMAIL_FROM_NAME: 'BingoRoyal'
    }
  }]
};
