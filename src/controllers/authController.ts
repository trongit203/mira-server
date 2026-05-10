import { Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { User } from '../models/User'
import { AuthRequest } from '../types'
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { ApiError } from '../utils/ApiError'

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
})

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = registerSchema.parse(req.body)
    const exists = await User.findOne({ email: body.email })
    if (exists) throw new ApiError(409, 'Email already registered')

    const user = await User.create(body)
    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)
    user.refreshToken = refreshToken
    await user.save()

    res.status(201).json({ success: true, data: { accessToken, refreshToken } })
  } catch (err) {
    next(err)
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const body = loginSchema.parse(req.body)
    const user = await User.findOne({ email: body.email }).select('+password')
    if (!user || !(await user.comparePassword(body.password))) {
      throw new ApiError(401, 'Invalid email or password')
    }

    const accessToken = signAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)
    user.refreshToken = refreshToken
    await user.save()

    res.json({ success: true, data: { accessToken, refreshToken } })
  } catch (err) {
    next(err)
  }
}

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body
    if (!refreshToken) throw new ApiError(400, 'Refresh token required')

    const payload = verifyRefreshToken(refreshToken)
    const user = await User.findById(payload.sub).select('+refreshToken')
    if (!user || user.refreshToken !== refreshToken) {
      throw new ApiError(401, 'Invalid refresh token')
    }

    const newAccessToken = signAccessToken(user.id)
    const newRefreshToken = signRefreshToken(user.id)
    user.refreshToken = newRefreshToken
    await user.save()

    res.json({ success: true, data: { accessToken: newAccessToken, refreshToken: newRefreshToken } })
  } catch (err) {
    next(err)
  }
}

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body
    if (refreshToken) {
      await User.findOneAndUpdate({ refreshToken }, { refreshToken: null })
    }
    res.json({ success: true })
  } catch (err) {
    next(err)
  }
}

export async function me(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await User.findById(req.userId).select('email name createdAt')
    if (!user) throw new ApiError(404, 'User not found')
    res.json({ success: true, data: { id: user.id, email: user.email, name: user.name, createdAt: user.createdAt } })
  } catch (err) {
    next(err)
  }
}
