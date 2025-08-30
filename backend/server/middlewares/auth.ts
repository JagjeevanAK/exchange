import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import type { JWTPayload } from "../types/auth";

const JWT_SECRET = process.env.JWT_SECRET || "jwt-key";

export const auth = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(403).json({
            message: "No authorization in header"
        });
    }
    
    const token = authHeader.split(" ")[1];

    if (!token) {
        return res.status(403).json({
            message: "No token in header"
        });
    }

    jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(403).json({
                message: "Invalid token"
            });
        }
        req.user = decoded as JWTPayload;
        next();
    });
}