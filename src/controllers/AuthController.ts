import { Express, Request, Response } from 'express'
import Controller from './Controller'
import _ from 'lodash'
import { redisCache } from '../cache'
import jwt from 'jsonwebtoken'
import prisma from '../database'
import { TokenPayload } from '../auth'

const cacheTTL = 1800

class AuthController implements Controller {
  startup (app: Express) {
    app.use('/hasura/auth', async (req: Request, res: Response) => {
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

      const cache = await redisCache
      try {
        // Check for cached response for this token to save round trips to db
        const cached = await cache.get<string>(token)
        if (cached) {
          if (cached === 'unauthorized') {
            return res.status(401).json({ error: 'unauthorized' })
          }
          return res.json(JSON.parse(cached))
        }

        if (!process.env.JWT_TOKEN_KEY) {
          throw new Error('Backend not configured - missing jwt token key')
        }

        // Decode and verify the token
        const decoded = jwt.verify(token, process.env.JWT_TOKEN_KEY)

        const userId = (decoded as TokenPayload).user_id

        if (!userId) {
          // No usre id in the token => not authenticated
          await cache.set(token, 'unauthorized', cacheTTL)
          res.status(401).json({ error: 'unauthorized' })
          return
        }

        // Check if user has verified their email
        const user = await prisma.users.findUnique({
          where: {
            id: userId,
          },
        })
        if (!user) {
          throw new Error('User not found!')
        }

        const role = 'user'

        // Give hasura the user's id and role
        const responseData = {
          'X-Hasura-Role': role,
          'X-Hasura-User-Id': userId
        }
        await cache.set(token, JSON.stringify(responseData), cacheTTL)
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
