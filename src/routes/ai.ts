import { Router } from 'express'
import { authenticate } from '../middleware/auth'
import { chat } from '../controllers/aiController'

const router = Router()

router.use(authenticate)
router.post('/chat', chat)

export default router
