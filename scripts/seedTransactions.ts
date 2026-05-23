import mongoose from 'mongoose'
import { Transaction } from '../src/models/Transaction'
import { TransactionType, DataSource } from '../src/types'

const MONGO_URI = process.env.MONGODB_URI ?? 'mongodb://localhost:27017/mira'
const USER_ID = new mongoose.Types.ObjectId('6a06f330c0aca48c41d34deb')
const BATCH_SIZE = 500
const TOTAL = 10_000

const TYPES: TransactionType[] = ['income', 'expense']
const SOURCES: DataSource[] = ['manual', 'ocr', 'momo', 'zalopay', 'bank_sync']

const INCOME_CATEGORIES = ['salary', 'freelance', 'investment', 'bonus', 'gift', 'refund']
const EXPENSE_CATEGORIES = [
  'food', 'transport', 'shopping', 'entertainment', 'health',
  'education', 'utilities', 'rent', 'insurance', 'travel',
]

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

function randAmount(type: TransactionType): number {
  if (type === 'income') return Math.round((Math.random() * 49_000_000 + 1_000_000) / 1000) * 1000
  return Math.round((Math.random() * 4_900_000 + 100_000) / 1000) * 1000
}

function randDate(): Date {
  // Spread across the last 2 years
  const now = Date.now()
  const twoYearsAgo = now - 2 * 365 * 24 * 60 * 60 * 1000
  return new Date(twoYearsAgo + Math.random() * (now - twoYearsAgo))
}

async function seed() {
  await mongoose.connect(MONGO_URI)
  console.log(`Connected to ${MONGO_URI}`)

  let inserted = 0
  while (inserted < TOTAL) {
    const size = Math.min(BATCH_SIZE, TOTAL - inserted)
    const docs = Array.from({ length: size }, () => {
      const type = rand(TYPES)
      const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
      return {
        userId: USER_ID,
        amount: randAmount(type),
        type,
        category: rand(categories),
        note: '',
        date: randDate(),
        source: rand(SOURCES),
        isDeleted: false,
      }
    })

    await Transaction.insertMany(docs, { ordered: false })
    inserted += size
    console.log(`Inserted ${inserted}/${TOTAL}`)
  }

  console.log('Done.')
  await mongoose.disconnect()
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
