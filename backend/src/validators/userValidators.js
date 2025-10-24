import { body } from 'express-validator';

export const adminCreateUserValidator = [

  body('username')
    .optional()
    .trim()
    .isLength({ min: 3, max: 32 }).withMessage('username deve ter 3-32 chars')
    .matches(/^[A-Za-z0-9_]+$/).withMessage('username deve conter apenas letras, números e _'),
 
  body('username')
    .trim()
    .isLength({ min: 3, max: 32 }).withMessage('username deve ter 3-32 chars')
    .matches(/^[A-Za-z0-9_]+$/).withMessage('username deve conter apenas letras, números e _'),
  body('email')
    .trim().isEmail().withMessage('email inválido')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 }).withMessage('senha deve ter no mínimo 8 chars'),
  body('role')
    .optional().isIn(['user','admin']).withMessage('role inválida')
];

export const adminUpdateUserValidator = [
  body('email').optional().trim().isEmail().withMessage('email inválido').normalizeEmail(),
  body('password').optional().isLength({ min: 8 }).withMessage('senha deve ter no mínimo 8 chars'),
  body('role').optional().isIn(['user','admin']).withMessage('role inválida')
];


