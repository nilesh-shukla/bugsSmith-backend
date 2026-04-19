import jwt from 'jsonwebtoken';

export default function generateTokens(user) {
    const payload = { id: user.id.toString(), email: user.email, role: user.role };

    const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET
    const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET
    const ACCESS_TOKEN_EXPIRES_IN = process.env.ACCESS_TOKEN_EXPIRES_IN || '15m';
    const REFRESH_TOKEN_EXPIRES_IN = process.env.REFRESH_TOKEN_EXPIRES_IN || '7d';

    const accessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, {
        expiresIn: ACCESS_TOKEN_EXPIRES_IN,
    });

    const refreshToken = jwt.sign(payload, REFRESH_TOKEN_SECRET, {
        expiresIn: REFRESH_TOKEN_EXPIRES_IN,
    });

    return { accessToken, refreshToken };
}