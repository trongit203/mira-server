import { Request, Response, NextFunction } from 'express'
import { env } from '../config/env'

interface RequestLog {
  timestamp: string
  method: string
  path: string
  query: Record<string, any>
  body: Record<string, any>
  headers: Record<string, any>
  ip: string
}

interface ResponseLog {
  statusCode: number
  duration: number
  size: number
  headers: Record<string, any>
}

function sanitizeObject(obj: any, depth = 0): any {
  if (depth > 3) return '[Object]'
  if (!obj || typeof obj !== 'object') return obj

  const sensitiveKeys = ['password', 'token', 'secret', 'authorization', 'refreshToken']
  const sanitized: Record<string, any> = Array.isArray(obj) ? [] : {}

  for (const key in obj) {
    if (sensitiveKeys.some((sensitive) => key.toLowerCase().includes(sensitive.toLowerCase()))) {
      sanitized[key] = '***REDACTED***'
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key], depth + 1)
    } else {
      sanitized[key] = obj[key]
    }
  }

  return sanitized
}

function colorize(text: string, color: 'reset' | 'bright' | 'dim' | 'red' | 'green' | 'yellow' | 'blue'): string {
  const colors: Record<string, string> = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    dim: '\x1b[2m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
  }
  return `${colors[color]}${text}${colors.reset}`
}

function getStatusColor(status: number): 'green' | 'yellow' | 'red' {
  if (status < 300) return 'green'
  if (status < 400) return 'yellow'
  return 'red'
}

export function logger(req: Request, res: Response, next: NextFunction): void {
  if (!env.isDev) {
    next()
    return
  }

  const startTime = Date.now()
  const requestLog: RequestLog = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: req.path,
    query: Object.keys(req.query).length > 0 ? sanitizeObject(req.query) : {},
    body: Object.keys(req.body).length > 0 ? sanitizeObject(req.body) : {},
    headers: {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      authorization: req.headers.authorization ? '***REDACTED***' : undefined,
    },
    ip: req.ip || req.socket.remoteAddress || 'unknown',
  }

  // Log incoming request
  console.log(
    `\n${colorize('→ REQUEST', 'bright')} ${colorize(`${req.method} ${req.path}`, 'blue')} ${colorize(`(${requestLog.ip})`, 'dim')}`
  )
  if (Object.keys(requestLog.query).length > 0) {
    console.log(`  ${colorize('Query:', 'dim')}`, requestLog.query)
  }
  if (Object.keys(requestLog.body).length > 0) {
    console.log(`  ${colorize('Body:', 'dim')}`, requestLog.body)
  }

  // Override res.json and res.send to log response
  const originalJson = res.json.bind(res)
  const originalSend = res.send.bind(res)

  res.json = function (data: any) {
    const duration = Date.now() - startTime
    const statusColor = getStatusColor(res.statusCode)
    const responseLog: ResponseLog = {
      statusCode: res.statusCode,
      duration,
      size: JSON.stringify(data).length,
      headers: {
        'content-type': res.getHeader('content-type'),
      },
    }

    console.log(
      `${colorize('← RESPONSE', 'bright')} ${colorize(String(res.statusCode), statusColor)} ${colorize(`${duration}ms`, 'dim')} ${colorize(`(${responseLog.size}B)`, 'dim')}`
    )
    if (data && typeof data === 'object') {
      console.log(`  ${colorize('Data:', 'dim')}`, sanitizeObject(data))
    }

    return originalJson(data)
  }

  res.send = function (data: any) {
    const duration = Date.now() - startTime
    const statusColor = getStatusColor(res.statusCode)
    const size = typeof data === 'string' ? data.length : JSON.stringify(data).length

    console.log(
      `${colorize('← RESPONSE', 'bright')} ${colorize(String(res.statusCode), statusColor)} ${colorize(`${duration}ms`, 'dim')} ${colorize(`(${size}B)`, 'dim')}`
    )

    return originalSend(data)
  }

  next()
}
