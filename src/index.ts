import express from 'express'
import cors from 'cors'
import { env } from './config/env'
import { connectDatabase } from './config/database'
import { errorHandler } from './middleware/errorHandler'
import authRoutes from './routes/auth'
import transactionRoutes from './routes/transactions'

const app = express()

app.use(cors())
app.use(express.json())

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
