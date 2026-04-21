import { Request } from 'express'

export interface AuthRequest extends Request {
  userId?: string
}

export type TransactionType = 'income' | 'expense'

export type DataSource = 'manual' | 'ocr' | 'momo' | 'zalopay' | 'bank_sync'
