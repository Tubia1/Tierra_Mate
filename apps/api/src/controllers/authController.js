import { Router } from 'express';
import { asyncHandler } from '../helpers/asyncHandler.js';
import { validate } from '../middlewares/validate.js';
import { loginBody } from '../schemas/authSchemas.js';
import * as authService from '../services/authService.js';

export const authController = Router();

authController.post('/login', validate({ body: loginBody }), asyncHandler(async (req, res) => {
  const data = await authService.login(req.validated.body);
  res.json({ data });
}));
