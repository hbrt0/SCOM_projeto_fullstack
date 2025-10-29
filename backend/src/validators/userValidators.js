import { body } from 'express-validator';

// Validator usado pelo painel/admin para criar um usuário.
// Observação: há uma duplicação do bloco de username neste arquivo — normalmente
// apenas um conjunto de regras é necessário (ou .optional() ou obrigatório).
export const adminCreateUserValidator = [

  // Se deseja que username seja obrigatório ao criar, remova o .optional() acima.
  body('username')
    .trim()
    .isLength({ min: 3, max: 32 }).withMessage('username deve ter 3-32 chars')
    .matches(/^[A-Za-z0-9_]+$/).withMessage('username deve conter apenas letras, números e _'),

  // Validação de e-mail: trim, formato válido e normalização (ex.: remove letras maiúsculas,
  // remove pontos em provedores que ignoram, etc.)
  body('email')
    .trim().isEmail().withMessage('email inválido')
    .normalizeEmail(),

  // Senha: mínimo de 8 caracteres (política básica de segurança)
  body('password')
    .isLength({ min: 8 }).withMessage('senha deve ter no mínimo 8 chars'),

  // Role: opcional, mas se informado deve ser 'user' ou 'admin'
  body('role')
    .optional().isIn(['user','admin']).withMessage('role inválida')
];

export const adminUpdateUserValidator = [
  // No update, todos os campos são opcionais — aplica validações apenas quando presentes.

  // Email opcional: valida e normaliza se fornecido
  body('email').optional().trim().isEmail().withMessage('email inválido').normalizeEmail(),

  // Senha opcional: se fornecida, deve obedecer ao mínimo de caracteres
  body('password').optional().isLength({ min: 8 }).withMessage('senha deve ter no mínimo 8 chars'),

  // Role opcional: se fornecida, deve ser 'user' ou 'admin'
  body('role').optional().isIn(['user','admin']).withMessage('role inválida')
];


