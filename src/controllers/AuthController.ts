import { Express, Request, Response } from 'express'
import Controller from './Controller'
import _ from 'lodash'
import cache from '../cache'
import jwt from 'jsonwebtoken'
import prisma from '../database'
import { TokenPayload, verifyToken } from '../auth'

const cacheTTL = 1800

class AuthController implements Controller {
  startup (app: Express) {
    app.all('/hasura/auth', async (req: Request, res: Response) => {
      // Be nice in the way we look for a token

      // Check auth header first
      let token: string = req.headers.authorization || ''

      // Then look in request body
      if (!token && _.has(req, 'body')) {
        token = req.body.token || ''
      }

      // Then look in querystring
      if (!token && _.has(req, 'query.token')) {
        token = req.query.token + ''
      }

      // Strip "Bearer " off the token for decoding below
      if (_.startsWith(token, 'Bearer')) {
        token = token.replace('Bearer ', '')
      }

      // No token - you're public
      if (!token) {
        return res.json({
          'x-hasura-role': 'public'
        })
      }

      try {
        // Check for cached response for this token to save round trips to db
        const cached = await cache.get(token)
        if (cached) {
          if (cached === 'unauthorized') {
            return res.status(401).json({ error: 'unauthorized' })
          }
          return res.json(JSON.parse(cached))
        }

        // Decode and verify the token
        const decoded = verifyToken(token)

        const userId = decoded.user_id

        if (!userId) {
          // No user id in the token => not authenticated
          await cache.set(userId+':'+token, 'unauthorized', cacheTTL)
          res.status(401).json({ error: 'unauthorized' })
          return
        }

        // Check if exists
        const user = await prisma.users.findUnique({
          where: {
            id: userId,
          },
        })
        if (!user) {
          throw new Error('User not found!')
        }

        // Use password timestamp to invalidate tokens when password changes
        // Note, this depends on user's cached tokens getting removed on password changes
        if (user.password_at.getTime() !== decoded.password_at) {
          throw new Error('Token expired!')
        }

        const role = 'user'

        // Give hasura the user's id and role
        const responseData = {
          'X-Hasura-Role': role,
          'X-Hasura-User-Id': userId
        }
        await cache.set(userId+':'+token, JSON.stringify(responseData), cacheTTL)
        res.json(responseData)

      } catch (error) {
        await cache.set(token, 'unauthorized', cacheTTL)
        console.error(error)
        res.status(401).json({ error: 'unauthorized' })
      }
    })
  }

  async shutdown () {
    // No shutdown actions for this controller
  }
}

const controller = new AuthController()

export default controller
