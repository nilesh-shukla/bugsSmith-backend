export class AppError extends Error {
    constructor(message, statusCode, code, details=null){
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}