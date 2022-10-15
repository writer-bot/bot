const winston = require("winston");
const path = require("node:path");
require('winston-daily-rotate-file');
require('./globals')

// Define formats for different loggers.
const formats = {
    file: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
            (info) => `[${info.timestamp}][${info.level.toUpperCase()}] ${info.message}`
        )
    ),
    console: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(
            (info) => `[${info.level}] ${info.message}`
        )
    ),
};

// Define loggers we can use.
const loggers = {
    infos: winston.createLogger({
        level: 'info',
        transports: [
            new winston.transports.Console({ format: formats.console }),
            new winston.transports.DailyRotateFile({
                filename: path.join(LOG_DIR, '%DATE%-app.log'),
                datePattern: 'DD',
                format: formats.file
            }),
        ],
    }),
    errors: winston.createLogger({
        level: 'error',
        transports: [
            new winston.transports.Console({ format: formats.console }),
            new winston.transports.DailyRotateFile({
                filename: path.join(LOG_DIR, '%DATE%-error.log'),
                datePattern: 'DD',
                format: formats.file
            }),
        ],
    }),
    debugs: winston.createLogger({
        level: 'debug',
        transports: [
            new winston.transports.Console({ format: formats.console }),
            new winston.transports.DailyRotateFile({
                filename: path.join(LOG_DIR, '%DATE%-debug.log'),
                datePattern: 'DD',
                format: formats.file,
            }),
        ],
    }),
};

// Overwrite logger to use the ones we want.
const logger = {
    info: (message, args = false) => {
        message = (args) ? message + '\n' + JSON.stringify(args) : message;
        return loggers.infos.info(message);
    },
    error: (message, args = false) => {
        message = (args) ? message + '\n' + JSON.stringify(args) : message;
        return loggers.errors.error(message);
    },
    debug: (message, args = false) => {
        message = (args) ? message + '\n' + JSON.stringify(args) : message;
        return loggers.debugs.debug(message);
    },

};

module.exports = logger;