import { users } from '@prisma/client'
import jwt from 'jsonwebtoken'

export class TokenPayload {
  user_id: string = ''
  email: string = ''

  constructor(user_id: string, email: string) {
    this.user_id = user_id
    this.email = email
  }
}

export function generateTokenForUser (user: users) {
  if (!process.env.JWT_TOKEN_KEY) {
    throw new Error('Backend not configured - missing jwt token key')
  }
  return jwt.sign(
    JSON.parse(JSON.stringify(new TokenPayload(user.id, user.email))),
    process.env.JWT_TOKEN_KEY

    // No expiration
    // {
    //   expiresIn: "2h",
    // }
  )
}