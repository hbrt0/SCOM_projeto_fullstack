export function notFound(req, res, next) {
  res.status(404).json({ error: 'Rota não encontrada' });
}

export function errorHandler(err, req, res, next) {
  // Sanitiza mensagens de erro
  const status = err.status || 500;
  const message = err.expose ? err.message : 'Erro interno do servidor';
  if (process.env.NODE_ENV !== 'test') {
    // eslint-disable-next-line no-console
    console.error(err);
  }
  res.status(status).json({ error: message });
}
