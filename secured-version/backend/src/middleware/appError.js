export class AppError extends Error {
    constructor(message, statusCode = 500, error = null) {
        super(message);

        this.statusCode = statusCode;
        this.status = `${statusCode}`.startsWith("4") ? "fail" : "error";
        this.isOperational = true;
        this.error = error;

        Error.captureStackTrace(this, this.constructor);
    }
}