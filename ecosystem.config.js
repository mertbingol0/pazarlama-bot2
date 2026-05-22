module.exports = {

  apps: [

    {

      name: "pazarlamabot",

      script: "npm",

      args: "start",

      cwd: "/home/pazarlama/pazarlama-bot2/backend",

      env: {

        NODE_ENV: "production",

        PORT: 4000,

      },

      watch: false,

      autorestart: true,

      max_restarts: 5,

      restart_delay: 3000,

    },

    {

      name: "pazarlamabot-frontend",

      script: "npm",

      args: "start",

      cwd: "/home/pazarlama/pazarlama-bot2/frontend",

      env: {

        NODE_ENV: "production",

        PORT: 4002,

      },

      watch: false,

      autorestart: true,

      max_restarts: 5,

      restart_delay: 3000,

    },

  ],

};
