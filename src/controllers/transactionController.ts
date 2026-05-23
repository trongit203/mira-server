import { Response, NextFunction } from 'express'
import { z } from 'zod'
import mongoose from 'mongoose'
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

export async function syncTransactions(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const since = req.query.since ? new Date(req.query.since as string) : new Date(0)
    if (isNaN(since.getTime())) throw new ApiError(400, 'Invalid since timestamp — use ISO 8601')

    const limit = Math.min(parseInt(req.query.limit as string) || 200, 500)

    // Compound cursor format: "updatedAt_iso|_id_hex"
    // A plain updatedAt cursor breaks when many records share the same millisecond
    // (e.g. bulk-inserted data). Adding _id as a tie-breaker guarantees no records are skipped.
    const rawCursor = req.query.cursor as string | undefined
    let cursorDate: Date | null = null
    let cursorId: string | null = null
    if (rawCursor) {
      const separatorIndex = rawCursor.lastIndexOf('|')
      if (separatorIndex === -1) throw new ApiError(400, 'Invalid cursor format — expected "updatedAt|_id"')
      cursorDate = new Date(rawCursor.slice(0, separatorIndex))
      cursorId = rawCursor.slice(separatorIndex + 1)
      if (isNaN(cursorDate.getTime())) throw new ApiError(400, 'Invalid cursor timestamp')
    }

    // Compound key filter: records after cursor = newer timestamp OR same timestamp with higher _id
    const filter = cursorDate && cursorId
      ? {
          userId: req.userId,
          $or: [
            { updatedAt: { $gt: cursorDate } },
            { updatedAt: cursorDate, _id: { $gt: cursorId } },
          ],
        }
      : {
          userId: req.userId,
          updatedAt: { $gt: since },
        }

    const transactions = await Transaction.find(filter)
      .sort({ updatedAt: 1, _id: 1 })  // compound sort matches compound cursor
      .limit(limit + 1)

    const hasMore = transactions.length > limit
    const data = hasMore ? transactions.slice(0, limit) : transactions
    // Compound cursor: "updatedAt|_id" — both parts needed for tie-breaking
    const nextCursor = hasMore
      ? `${data[data.length - 1].updatedAt.toISOString()}|${data[data.length - 1]._id}`
      : null

    res.json({ success: true, data, nextCursor, syncedAt: new Date().toISOString() })
  } catch (err) {
    next(err)
  }
}

export async function getDashboardSummary(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    // since defaults to epoch → all-time balance
    // Pass ?since=<ISO8601> to scope to a specific period (e.g. current month)
    const startDate = req.query.since ? new Date(req.query.since as string) : new Date(0)
    const userObjectId = new mongoose.Types.ObjectId(req.userId!)

    const [summary] = await Transaction.aggregate([
      { $match: { userId: userObjectId, isDeleted: false, date: { $gte: startDate } } },
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
