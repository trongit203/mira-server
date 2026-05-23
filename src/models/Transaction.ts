import mongoose, { Document, Schema } from 'mongoose'
import { DataSource, TransactionType } from '../types'

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId
  amount: number
  type: TransactionType
  category: string
  note: string
  date: Date
  source: DataSource
  isDeleted: boolean
  createdAt: Date
  updatedAt: Date
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    type: { type: String, enum: ['income', 'expense'], required: true },
    category: { type: String, required: true, trim: true },
    note: { type: String, default: '', trim: true },
    date: { type: Date, required: true },
    source: {
      type: String,
      enum: ['manual', 'ocr', 'momo', 'zalopay', 'bank_sync'],
      default: 'manual',
    },
    isDeleted: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
)

// Compound index — most common query pattern
TransactionSchema.index({ userId: 1, isDeleted: 1, date: -1 })

// Index for sync endpoint — compound (updatedAt, _id) supports the tie-breaking cursor query
TransactionSchema.index({ userId: 1, updatedAt: 1, _id: 1 })

export const Transaction = mongoose.model<ITransaction>('Transaction', TransactionSchema)
