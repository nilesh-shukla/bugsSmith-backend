import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../config/prismaClient.js';
import generateTokens from '../utils/generateToken.js';
import sanitizeUser from '../utils/sanitizeUser.js';
import { AppError } from '../utils/appError.js';

async function register({ firstName, lastName, email, password, cpassword, role }) {
    if (!firstName || !lastName || !email || !password || !cpassword) {
        throw new AppError('First name, last name, email, password, and confirm password are required');
    }

    if (password !== cpassword) {
        throw new AppError('Passwords do not match.');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (existingUser) {
        throw new AppError('Email is already in use');
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
        data: {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
            email: normalizedEmail,
            password: passwordHash,
            role: role || 'user',
        }
    });

    const tokens = generateTokens(user);

    // Optional persistence if schema has these fields
    if ('refreshToken' in user) {
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });
    } else if ('refreshTokens' in user && Array.isArray(user.refreshTokens)) {
        await prisma.user.update({ where: { id: user.id }, data: { refreshTokens: { push: tokens.refreshToken } } });
    }

    return { user: sanitizeUser(user), tokens };
}

async function login( email, password ) {
    if (!email || !password) {
        throw new AppError('Email and password are required', 400);
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
        throw new AppError('Invalid credentials', 400);
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new AppError('Invalid credentials', 400);
    }

    const tokens = generateTokens(user);

    // Optional persistence if schema has these fields
    if ('refreshToken' in user) {
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });
    } else if ('refreshTokens' in user && Array.isArray(user.refreshTokens)) {
        await prisma.user.update({ where: { id: user.id }, data: { refreshTokens: { push: tokens.refreshToken } } });
    }

    return { user: sanitizeUser(user), tokens };
}

async function logout({ userId, refreshToken }) {
    if (!userId) {
        throw new AppError('User id is required', 400);
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return true;

    // Optional persistence if schema has these fields
    if ('refreshToken' in user) {
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken: null } });
    } else if ('refreshTokens' in user && Array.isArray(user.refreshTokens)) {
        const newTokens = refreshToken ? user.refreshTokens.filter((token) => token !== refreshToken) : [];
        await prisma.user.update({ where: { id: user.id }, data: { refreshTokens: { set: newTokens } } });
    }

    return true;
}

async function refresh(refreshToken) {
    if (!refreshToken) {
        throw new AppError('Refresh token is required', 400);
    }

    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
    let payload;
    try {
        payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    } catch (err) {
        throw new AppError('Invalid refresh token', 400);
    }

    const userId = payload.sub;
    const user = await prisma.user.findUnique({ where: { id: Number(userId) } });
    if (!user) {
        throw new AppError('User not found', 404);
    }

    // If refresh token(s) are stored, validate the provided token
    if ('refreshToken' in user) {
        if (!user.refreshToken || user.refreshToken !== refreshToken) {
            throw new AppError('Refresh token not recognized', 400);
        }
    } else if ('refreshTokens' in user && Array.isArray(user.refreshTokens)) {
        if (!user.refreshTokens.includes(refreshToken)) {
            throw new AppError('Refresh token not recognized', 400);
        }
    }

    const tokens = generateTokens(user);

    // Persist new refresh token if applicable
    if ('refreshToken' in user) {
        await prisma.user.update({ where: { id: user.id }, data: { refreshToken: tokens.refreshToken } });
    } else if ('refreshTokens' in user && Array.isArray(user.refreshTokens)) {
        const newTokens = user.refreshTokens.filter((t) => t !== refreshToken);
        newTokens.push(tokens.refreshToken);
        await prisma.user.update({ where: { id: user.id }, data: { refreshTokens: { set: newTokens } } });
    }

    return { user: sanitizeUser(user), tokens };
}

export default {
    register,
    login,
    logout,
    refresh,
};