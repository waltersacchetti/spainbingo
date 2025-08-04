module.exports = {
  apps: [{
    name: 'spainbingo',
    script: './server.js',
    cwd: '/home/ec2-user',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
