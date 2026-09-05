import multer from "multer";

export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || 500;
    let message = err.message;

    if (err instanceof multer.MulterError) {
        statusCode = 400;
        if (err.code === "LIMIT_FILE_SIZE") {
            message = "File size exceeds the allowable limit";
        } else if (err.code === "LIMIT_UNEXPECTED_FILE") {
            message = `Unexpected upload field: ${err.field}`;
        }
    }

    console.error(err.stack);

    res.status(statusCode).json({
        error: message
    });
};