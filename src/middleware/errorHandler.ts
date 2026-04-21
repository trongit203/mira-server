import { Request, Response, NextFunction } from 'express'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof ApiError) {
    res.status(err.statusCode).json({ success: false, message: err.message })
    return
  }

  console.error(err)
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    ...(env.isDev && { stack: err.stack }),
  })
}
