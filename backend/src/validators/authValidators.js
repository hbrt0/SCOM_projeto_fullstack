import { body } from 'express-validator';

export const registerValidator = [
  body('username')
    .trim()
    .isLength({ min: 3, max: 32 }).withMessage('username deve ter 3-32 chars')
    .matches(/^[A-Za-z0-9_]+$/).withMessage('username deve conter apenas letras, números e _'),
  body('email')
    .trim().isEmail().withMessage('email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('senha deve ter no mínimo 8 chars')
];

export const loginValidator = [
  body('username').trim().notEmpty().withMessage('username é obrigatório'),
  body('password').notEmpty().withMessage('senha é obrigatória')
];


