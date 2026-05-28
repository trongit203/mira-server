import dotenv from 'dotenv'
dotenv.config()

export const env = {
  port: Number(process.env.PORT) || 3000,
  mongoUri: process.env.MONGODB_URI || 'mongodb://localhost:27017/mira',
  jwt: {
    secret: process.env.JWT_SECRET || 'dev_secret',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_refresh_secret',
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  isDev: process.env.NODE_ENV !== 'production',
  geminiApiKey: process.env.GEMINI_API_KEY || '',
}
