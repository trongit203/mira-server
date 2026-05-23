import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = Date.now()
  const { method, url } = req

  if (env.isDev) {
    const body = req.body
    if (body && Object.keys(body).length > 0) {
      // Mask sensitive fields so plaintext credentials never appear in logs
      const sanitized = { ...body }
      for (const key of ['password', 'token', 'refreshToken', 'secret']) {
        if (key in sanitized) sanitized[key] = '***'
      }
      console.log(`→ ${method} ${url}`, sanitized)
    } else {
      console.log(`→ ${method} ${url}`)
    }

    // Intercept res.json to capture the response body before it's sent
    const originalJson = res.json.bind(res)
    res.json = (body: unknown) => {
      res.locals.__body = body
      return originalJson(body)
    }
  }

  res.on('finish', () => {
    const ms = Date.now() - start
    const status = res.statusCode
    const color =
      status >= 500 ? '\x1b[31m' : status >= 400 ? '\x1b[33m' : status >= 300 ? '\x1b[36m' : '\x1b[32m'
    const reset = '\x1b[0m'

    if (env.isDev) {
      console.log(`← ${color}${method} ${url} ${status}${reset} +${ms}ms`, res.locals.__body ?? '')
    } else {
      console.log(`${color}${method} ${url} ${status}${reset} +${ms}ms`)
    }
  })

  next()
}
