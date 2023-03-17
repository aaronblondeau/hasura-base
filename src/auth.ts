import { users } from '@prisma/client'
import jwt from 'jsonwebtoken'

export class TokenPayload {
  user_id: string = ''
  email: string = ''
  password_at: number = 0

  constructor(user_id: string, email: string, password_at: number) {
    this.user_id = user_id
    this.email = email
    this.password_at = password_at
  }
}

export function generateTokenForUser (user: users) {
  if (!process.env.JWT_TOKEN_KEY) {
    throw new Error('Backend not configured - missing jwt token key')
  }
  return jwt.sign(
    JSON.parse(JSON.stringify(new TokenPayload(user.id, user.email, user.password_at.getTime()))),
    process.env.JWT_TOKEN_KEY

    // No expiration
    // {
    //   expiresIn: "2h",
    // }
  )
}

export function verifyToken (token: string) : TokenPayload {
  if (!process.env.JWT_TOKEN_KEY) {
    throw new Error('Backend not configured - missing jwt token key')
  }
  const decoded = jwt.verify(token, process.env.JWT_TOKEN_KEY) as TokenPayload
  return decoded
}