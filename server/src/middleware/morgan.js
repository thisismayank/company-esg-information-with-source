
import morgan from "morgan";

let loggerFormat =
    "[:date] :id :method :url HTTP/:http-version :status :response-time ms";


morgan.token("id", (req, res) => {
    return `[reqid: ${req.id}]`;
});

export const morganAccessLogger = morgan(loggerFormat, {
    stream: accessLogStream
});

export const morganStdErr = morgan(loggerFormat, {
    skip: function (req, res) {
        return res.statusCode < 400;
    },
    stream: process.stderr
});

export const morganStdOut = morgan(loggerFormat, {
    skip: function (req, res) {
        return res.statusCode >= 400;
    },
    stream: process.stdout
});