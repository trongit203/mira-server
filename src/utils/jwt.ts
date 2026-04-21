import jwt from 'jsonwebtoken'
import { env } from '../config/env'

export function signAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwt.secret, { expiresIn: env.jwt.expiresIn } as jwt.SignOptions)
}

export function signRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId }, env.jwt.refreshSecret, { expiresIn: env.jwt.refreshExpiresIn } as jwt.SignOptions)
}

export function verifyAccessToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwt.secret) as { sub: string }
}

export function verifyRefreshToken(token: string): { sub: string } {
  return jwt.verify(token, env.jwt.refreshSecret) as { sub: string }
}
