import winston from "winston";

const { combine, timestamp, printf } = winston.format;

let options = {
    console: {
        level: "silly",
        handleExceptions: true,
        json: false,
        colorize: true,
        silent: false,
        timestamp: true
    }
}

const transports = [new winston.transports.Console(options.console)]

export const wlogger = winston.createLogger({

    format: combine(
        timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
        printf(info => `${info.timestamp} ${info.level}: ${info.message}`)
    ),
    transports,
    exitOnError: false
});