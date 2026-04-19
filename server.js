import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './app/routes/auth.routes.js';
import { errorResponse } from './app/utils/apiResponse.js';
import { AppError } from './app/utils/appError.js';
import cookieParser from 'cookie-parser';

dotenv.config();

const app = express();

app.use(cors(
  {credentials: true,
  origin: ['http://localhost:5173']}
));

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth', authRoutes);

app.use((req, res) => {
  return res.status(404).json({ success: false, message: `Cannot ${req.method} ${req.originalUrl}` });
});

// Global error handler - always send JSON
app.use((err, req, res, next) => {
  console.error(err);
  const statusCode = err?.statusCode || 500;
  const message = err?.message || 'Internal Server Error';
  const details = err?.details || null;
  const errorCode = err?.code || (statusCode === 500 ? 'INTERNAL_SERVER_ERROR' : 'ERROR');
  return errorResponse(res, message, details, statusCode, errorCode);
});

app.listen(process.env.PORT, () => {
  console.log(`Server is running on port ${process.env.PORT}`);
});