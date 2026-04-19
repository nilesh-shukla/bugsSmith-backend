import { successResponse } from "../utils/apiResponse.js";
import asyncHandler from "express-async-handler";
import authService from "../services/auth.services.js";

export const loginController = asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const response = await authService.login(email, password);
    res.cookie('accessToken', response.tokens.accessToken, { httpOnly: true, secure: false
        , sameSite: 'Lax', maxAge: 15 * 60 * 1000
     });
    res.cookie('refreshToken', response.tokens.refreshToken, { httpOnly: true, secure: false, sameSite: 'Lax' , maxAge: 7 * 24 * 60 * 60 * 1000 });
    return successResponse(res, 'Login successful', response);
});

export const registerController = asyncHandler(async (req, res) => {
    const { firstName, lastName, email, password, cpassword, role } = req.body;
    const response = await authService.register({ firstName, lastName, email, password, cpassword, role });
    res.cookie('accessToken', response.tokens.accessToken, { httpOnly: true, secure: false, sameSite: 'Lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', response.tokens.refreshToken, { httpOnly: true, secure: false, sameSite: 'Lax' , maxAge: 7 * 24 * 60 * 60 * 1000 });
    return successResponse(res, 'Registration successful', response);
});

export const logoutController = asyncHandler(async (req, res) => {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    return successResponse(res, 'Logout successful');
});

export const refreshController = asyncHandler(async (req, res) => {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers['x-refresh-token'];
    const response = await authService.refresh(refreshToken);
    res.cookie('accessToken', response.tokens.accessToken, { httpOnly: true, secure: false, sameSite: 'Lax', maxAge: 15 * 60 * 1000 });
    res.cookie('refreshToken', response.tokens.refreshToken, { httpOnly: true, secure: false, sameSite: 'Lax', maxAge: 7 * 24 * 60 * 60 * 1000 });
    return successResponse(res, 'Token refreshed', response);
});