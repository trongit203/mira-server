import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import { connectDatabase } from './config/database'
import { errorHandler } from './middleware/errorHandler'
import { requestLogger } from './middleware/logger'
import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'

const app = express()

const allowedOrigins = env.isDev
  ? ['http://localhost:3000', 'http://10.0.2.2:3000'] // Android emulator uses 10.0.2.2 for host loopback
  : ['https://api.mira.vn']

app.use(cors({ origin: allowedOrigins, credentials: true }))
app.use(express.json({ limit: '1mb' }))
app.use(requestLogger)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.use('/v1/auth', authRoutes)
app.use('/v1/transactions', transactionRoutes)

app.use(errorHandler)

async function bootstrap() {
  await connectDatabase()
  app.listen(env.port, () => {
    console.log(`mira-server running on port ${env.port}`)
  })
}

bootstrap().catch(console.error)
