import { error, timeStamp } from "node:console";

export const successResponse = (res, message, data=null, statusCode=200) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
        meta:{ timeStamp: Date.now() }
    });
};

export const errorResponse = (res, message, details=null, statusCode=500, errorCode="INTERNAL SERVER ERROR") => {
    return res.status(statusCode).json({
        success: false,
        message,
        error:{ code: errorCode, details },
        meta:{ timeStamp: Date.now() }
    });
};