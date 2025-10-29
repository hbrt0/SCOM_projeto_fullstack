import { body } from 'express-validator';

// Validações para rota de registro (/register)
export const registerValidator = [
  // username: remove espaços nas extremidades, exige 3-32 caracteres e apenas letras, números e underscore
  body('username')
    .trim()
    .isLength({ min: 3, max: 32 }).withMessage('username deve ter 3-32 chars')
    .matches(/^[A-Za-z0-9_]+$/).withMessage('username deve conter apenas letras, números e _'),

  // email: valida formato e normaliza (ex.: remove letras maiúsculas, dots em alguns provedores)
  body('email')
    .trim()
    .isEmail().withMessage('email inválido')
    .normalizeEmail(),

  // password: exige ao menos 8 caracteres (política de senha básica)
  body('password')
    .isLength({ min: 8 }).withMessage('senha deve ter no mínimo 8 chars')
];

// Validações para rota de login (/login)
export const loginValidator = [
  // username obrigatório (após trim)
  body('username').trim().notEmpty().withMessage('username é obrigatório'),
  // password obrigatório
  body('password').notEmpty().withMessage('senha é obrigatória')
];


