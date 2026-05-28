import { Response, NextFunction } from 'express'
import { z } from 'zod'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { AuthRequest } from '../types'
import { ApiError } from '../utils/ApiError'
import { env } from '../config/env'

const chatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant']),
      content: z.string().min(1).max(2000),
    })
  ).min(1).max(50),
  context: z.object({
    transactionSummary: z.string().max(1000),
  }),
})

export async function chat(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    if (!env.geminiApiKey) throw new ApiError(503, 'AI service not configured')

    const body = chatSchema.parse(req.body)
    const { messages, context } = body

    const genAI = new GoogleGenerativeAI(env.geminiApiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const systemInstruction =
      `Bạn là trợ lý tài chính cá nhân thông minh, thân thiện và ngắn gọn. ` +
      `Luôn trả lời bằng tiếng Việt. ` +
      `Dữ liệu người dùng: ${context.transactionSummary}`

    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    const chatSession = model.startChat({
      history,
      systemInstruction,
    })

    const lastMessage = messages[messages.length - 1]
    const result = await chatSession.sendMessage(lastMessage.content)
    const reply = result.response.text()

    res.json({ success: true, data: { reply }, message: null })
  } catch (err) {
    next(err)
  }
}
