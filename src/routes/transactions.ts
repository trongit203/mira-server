import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import {
  getTransactions,
  createTransaction,
  getTransaction,
  updateTransaction,
  deleteTransaction,
  getDashboardSummary,
  syncTransactions,
} from '../controllers/transactionController'

const router = Router()

router.use(authenticate)

router.get('/dashboard', getDashboardSummary)
router.get('/sync', syncTransactions)  // must be before /:id to avoid param capture
router.get('/', getTransactions)
router.post('/', createTransaction)
router.get('/:id', getTransaction)
router.patch('/:id', updateTransaction)
router.delete('/:id', deleteTransaction)

export default router
