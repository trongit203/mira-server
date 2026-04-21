import { Response, NextFunction } from 'express'
import { AuthRequest } from '../types'
import { verifyAccessToken } from '../utils/jwt'
import { ApiError } from '../utils/ApiError'

export function authenticate(req: AuthRequest, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing authorization token'))
  }

  try {
    const token = header.slice(7)
    const payload = verifyAccessToken(token)
    req.userId = payload.sub
    next()
  } catch {
    next(new ApiError(401, 'Invalid or expired token'))
  }
}
