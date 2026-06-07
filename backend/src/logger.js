import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

const logger = pino( {
    // ─── Core ────────────────────────────────────────────────────────
    level: process.env.LOG_LEVEL || ( isDev ? 'debug' : 'info' ),

    // ─── Static fields added to every log line ───────────────────────
    base: {
        app: 'cnk-go',
        env: process.env.NODE_ENV,
    },

    // ─── ISO 8601 timestamp ──────────────────────────────────────────
    timestamp: pino.stdTimeFunctions.isoTime,

    // ─── String label ("info") instead of numeric level (30) ─────────
    formatters: {
        level( label ) {
            return { level: label };
        },
    },

    // ─── Human-readable req/res — only the fields that matter ────────
    serializers: {
        err: pino.stdSerializers.err, // full stack trace, message, type
        req( req ) {
            return {
                id: req.id,
                method: req.method,
                url: req.url,
                ip: req.remoteAddress,
                userAgent: req.headers['user-agent'],
                contentType: req.headers['content-type'],
            };
        },
        res( res ) {
            return {
                statusCode: res.statusCode,
                // responseTime is appended automatically by pino-http
            };
        },
    },

    // ─── Dev only: pretty-print (pino-pretty is a devDependency) ─────
    ...( isDev && {
        transport: {
            target: 'pino-pretty',
            options: {
                colorize: true,
                ignore: 'pid,hostname,app,env', // clean in dev, useful in prod JSON
                translateTime: 'SYS:HH:MM:ss',
                singleLine: false,
            },
        },
    } ),
} );

export default logger;