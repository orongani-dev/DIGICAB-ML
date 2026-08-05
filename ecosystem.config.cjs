module.exports = {
  apps: [
    {
      name: 'digicab-ml',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        DATABASE_PATH: 'database.db'
      },
      restart_delay: 3000,
      max_restarts: 10
    }
  ]
};
