import jwt from "jsonwebtoken";
import prisma from "../config/prismaClient.js";
import { AppError } from "../utils/appError.js";
import sanitizeUser from "../utils/sanitizeUser.js";

export const isAuthenticated = async (req, res, next) =>{
   try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new AppError("Unauthorized", 401);
    }

    const token = authHeader.split(" ")[1];

    let payload;
    try {
      payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    } catch (err) {
      throw new AppError("Invalid or expired token", 401);
    }
    
    const userId = payload.sub || payload.id || payload.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError("User not found", 401);
    }

    req.user = sanitizeUser(user);

    next();
  } catch (err) {
    next(err);
  } 
}
