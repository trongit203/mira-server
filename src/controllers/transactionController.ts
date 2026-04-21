import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { AuthRequest } from '../types'
import { Transaction } from '../models/Transaction'
import { ApiError } from '../utils/ApiError'

const createSchema = z.object({
  amount: z.number().positive(),
  type: z.enum(['income', 'expense']),
  category: z.string().min(1),
  note: z.string().optional().default(''),
  date: z.string().datetime(),
  source: z.enum(['manual', 'ocr', 'momo', 'zalopay', 'bank_sync']).optional().default('manual'),
})

export async function getTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page = '1', limit = '20', type, category } = req.query
    const filter: Record<string, unknown> = { userId: req.userId, isDeleted: false }
    if (type) filter.type = type
    if (category) filter.category = category

    const skip = (Number(page) - 1) * Number(limit)
    const [transactions, total] = await Promise.all([
      Transaction.find(filter).sort({ date: -1 }).skip(skip).limit(Number(limit)),
      Transaction.countDocuments(filter),
    ])

    res.json({ success: true, data: transactions, meta: { total, page: Number(page), limit: Number(limit) } })
  } catch (err) {
    next(err)
  }
}

export async function createTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSchema.parse(req.body)
    const transaction = await Transaction.create({ ...body, userId: req.userId, date: new Date(body.date) })
    res.status(201).json({ success: true, data: transaction })
  } catch (err) {
    next(err)
  }
}

export async function getTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const transaction = await Transaction.findOne({ _id: req.params.id, userId: req.userId, isDeleted: false })
    if (!transaction) throw new ApiError(404, 'Transaction not found')
    res.json({ success: true, data: transaction })
  } catch (err) {
    next(err)
  }
}

export async function updateTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = createSchema.partial().parse(req.body)
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, isDeleted: false },
      body,
      { new: true, runValidators: true }
    )
    if (!transaction) throw new ApiError(404, 'Transaction not found')
    res.json({ success: true, data: transaction })
  } catch (err) {
    next(err)
  }
}

export async function deleteTransaction(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, userId: req.userId, isDeleted: false },
      { isDeleted: true },
      { new: true }
    )
    if (!transaction) throw new ApiError(404, 'Transaction not found')
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function getDashboardSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const [summary] = await Transaction.aggregate([
      { $match: { userId: req.userId, isDeleted: false, date: { $gte: startOfMonth } } },
      {
        $group: {
          _id: null,
          totalIncome: { $sum: { $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0] } },
          totalExpense: { $sum: { $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0] } },
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          totalIncome: 1,
          totalExpense: 1,
          balance: { $subtract: ['$totalIncome', '$totalExpense'] },
          count: 1,
        },
      },
    ])

    res.json({
      success: true,
      data: summary ?? { totalIncome: 0, totalExpense: 0, balance: 0, count: 0 },
    })
  } catch (err) {
    next(err)
  }
}
