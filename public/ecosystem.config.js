module.exports = {
  apps: [{
    name: 'spainbingo',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    cwd: '/var/www/spainbingo/public',
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      DB_HOST: 'spainbingo-db.clzgxn85wdjh.eu-west-1.rds.amazonaws.com',
      DB_PORT: 5432,
      DB_NAME: 'spainbingo',
      DB_USERNAME: 'spainbingo_admin',
      DB_PASSWORD: 'SpainBingo2024!'
    }
  }]
};
