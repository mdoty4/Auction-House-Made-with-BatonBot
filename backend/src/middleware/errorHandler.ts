export function errorHandler(err: any, req: any, res: any, next: any) {
  console.error(err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal Server Error',
  });
}