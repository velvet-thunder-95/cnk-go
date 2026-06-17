import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

// ─── Transports (Dev vs PM2 vs Better Stack) ─────────────────────
const targets = [];

if ( isDev ) {
    targets.push( {
        target: 'pino-pretty',
        options: {
            colorize: true,
            ignore: 'pid,hostname,app,env',
            translateTime: 'SYS:HH:MM:ss',
            singleLine: false,
        },
    } );
} else {
    // Always log raw JSON to stdout for PM2
    targets.push( {
        target: 'pino/file',
        options: { destination: 1 },
    } );

    // If token exists, ALSO send to Better Stack
    if ( process.env.BETTERSTACK_SOURCE_TOKEN ) {
        targets.push( {
            target: '@logtail/pino',
            options: { sourceToken: process.env.BETTERSTACK_SOURCE_TOKEN },
        } );
    }
}

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
            };
        },
    },

    transport: { targets },
} );

export default logger;