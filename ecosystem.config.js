module.exports = {
    apps: [
        {
            name: "cnk-frontend",
            script: "npm",
            args: "start",
            cwd: "./",
            env: {
                NODE_ENV: "production",
                PORT: 3000
            }
        },
        {
            name: "cnk-backend",
            script: "src/index.js",
            cwd: "./backend",
            env: {
                NODE_ENV: "production",
                PORT: 4000
            }
        },
        {
            name: "cron-flights",
            script: "scripts/runFlightCron.js",
            cwd: "./backend",
            env: {
                NODE_ENV: "production"
            }
        },
        {
            name: "cron-hotels",
            script: "scripts/runHotelCron.js",
            cwd: "./backend",
            env: {
                NODE_ENV: "production"
            }
        },
        {
            name: "cron-weekly-agg",
            script: "scripts/runWeeklyAggregationCron.js",
            cwd: "./backend",
            env: {
                NODE_ENV: "production"
            }
        }
    ]
};