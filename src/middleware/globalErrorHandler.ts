import {
    PrismaClientKnownRequestError,
    PrismaClientValidationError,
    PrismaClientInitializationError,
    PrismaClientRustPanicError,
    PrismaClientUnknownRequestError
} from "@prisma/client/runtime/client";
import { NextFunction, Request, Response } from "express";

export default function errorHandler(
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
) {
    let statusCode = 500;
    let errorMessage = "Internal Server Error";
    let errorDetails = err;

    /* -------------------- Prisma Validation Error -------------------- */
    if (err instanceof PrismaClientValidationError) {
        statusCode = 400;
        errorMessage = "Invalid data provided or missing required fields.";
    }

    /* ---------------- Prisma Known Request Errors ---------------- */
    else if (err instanceof PrismaClientKnownRequestError) {
        switch (err.code) {
            case "P2000":
                statusCode = 400;
                errorMessage = "The provided value is too long for a field.";
                break;

            case "P2001":
                statusCode = 404;
                errorMessage = "The record searched for does not exist.";
                break;

            case "P2002":
                statusCode = 409;
                errorMessage = "Duplicate value violates unique constraint.";
                break;

            case "P2003":
                statusCode = 400;
                errorMessage = "Foreign key constraint failed.";
                break;

            case "P2004":
                statusCode = 400;
                errorMessage = "A constraint failed on the database.";
                break;

            case "P2005":
                statusCode = 400;
                errorMessage = "Invalid value stored in the database.";
                break;

            case "P2006":
                statusCode = 400;
                errorMessage = "Invalid value for field type.";
                break;

            case "P2007":
                statusCode = 400;
                errorMessage = "Data validation error.";
                break;

            case "P2011":
                statusCode = 400;
                errorMessage = "Null constraint violation.";
                break;

            case "P2012":
                statusCode = 400;
                errorMessage = "Missing required value.";
                break;

            case "P2014":
                statusCode = 400;
                errorMessage = "Relation violation error.";
                break;

            case "P2015":
                statusCode = 404;
                errorMessage = "Related record not found.";
                break;

            case "P2016":
                statusCode = 400;
                errorMessage = "Query interpretation error.";
                break;

            case "P2017":
                statusCode = 400;
                errorMessage = "Records are not connected.";
                break;

            case "P2021":
                statusCode = 500;
                errorMessage = "Table does not exist in the database.";
                break;

            case "P2022":
                statusCode = 500;
                errorMessage = "Column does not exist in the database.";
                break;

            case "P2025":
                statusCode = 404;
                errorMessage = "Record not found.";
                break;

            default:
                statusCode = 400;
                errorMessage = "Database request error.";
                break;
        }
    }

    /* ---------------- Prisma Initialization Error ---------------- */
    else if (err instanceof PrismaClientInitializationError) {
        switch (err.errorCode) {
            case "P1000":
                statusCode = 401;
                errorMessage = "Database authentication failed.";
                break;

            case "P1001":
                statusCode = 503;
                errorMessage = "Cannot reach database server.";
                break;

            case "P1002":
                statusCode = 504;
                errorMessage = "Database connection timed out.";
                break;

            case "P1003":
                statusCode = 404;
                errorMessage = "Database does not exist.";
                break;

            case "P1008":
                statusCode = 504;
                errorMessage = "Database operation timed out.";
                break;

            case "P1010":
                statusCode = 403;
                errorMessage = "Database access denied for this user.";
                break;

            case "P1011":
                statusCode = 500;
                errorMessage = "TLS/SSL connection error with database.";
                break;

            case "P1012":
                statusCode = 500;
                errorMessage = "Invalid database connection URL.";
                break;

            default:
                statusCode = 500;
                errorMessage = "Failed to initialize database connection.";
                break;
        }
    }

    /* ---------------- Prisma Rust Panic Error ---------------- */
    else if (err instanceof PrismaClientRustPanicError) {
        statusCode = 500;
        errorMessage = "Critical database error occurred.";
    }

    /* ---------------- Prisma Unknown Error ---------------- */
    else if (err instanceof PrismaClientUnknownRequestError) {
        statusCode = 500;
        errorMessage = "Unknown database error occurred.";
    }

    /* ---------------- Final Response ---------------- */
    res.status(statusCode).json({
        message: errorMessage,
        error: errorDetails
    });
}
