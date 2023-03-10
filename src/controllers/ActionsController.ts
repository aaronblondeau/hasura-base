import { Express, Request, Response } from 'express'
import Controller from './Controller'
import _ from 'lodash'
import sendVerificationEmail, { SendVerificationEmailJobData } from '../queues/sendVerificationEmail'
import bcrypt from 'bcryptjs'
import prisma from '../database'
import { generateTokenForUser } from '../auth'

class ActionsController implements Controller {

  async getUserForRequest(req: Request) {
    const userId = req.body.session_variables['x-hasura-user-id']

    const user = await prisma.users.findUnique({
      where: {
        id: userId,
      },
    })
    return user
  }

  startup (app: Express) {
    app.use('/hasura/actions/register', async (req: Request, res: Response) => {
      try {
        let email = null
        if (_.has(req, 'body.input.email')) {
          email = req.body.input.email
        } else {
          return res.status(400).send({ message: 'Email is required.' })
        }
        // Always handle emails in lowercase on the backend
        email = email.toLowerCase()
    
        let password = ''
        if (_.has(req, 'body.input.password')) {
          password = req.body.input.password
        } else {
          return res.status(400).send({ message: 'Password is required.' })
        }
        if (password.length < 5) {
          return res.status(400).send({ message: 'Password must be at least 5 characters long.' })
        }
        const hashedPassword = await bcrypt.hash(password, 10)

        // Check for existing user so we can send a nicer error message then unique key constraint
        const existing = await prisma.users.findUnique({
          where: {
            email,
          },
        })
        if (existing) {
          throw new Error(`User with email ${email} already exists.`)
        }
    
        // Create the user in the database (unique key constraint will cause error if user already exists)
        const user = await prisma.users.create({
          data: {
            email,
            hashed_password: hashedPassword
          },
        })

        // Create auth token for user
        const token = generateTokenForUser(user)
    
        // Send verification email
        await sendVerificationEmail.add('send verification email for user id ' + user.id, new SendVerificationEmailJobData(user.id))
    
        return res.send({ token, id: user.id })
      } catch (error) {
        console.error(error)
        if (error instanceof Error) {
          return res.status(400).send({ message: error.message })
        } else {
          return res.status(400).send({ message: error })
        }
      }
    })

    app.use('/hasura/actions/login', async (req: Request, res: Response) => {
      try {
        let email = null
        if (_.has(req, 'body.input.email')) {
          email = req.body.input.email
        } else {
          return res.status(400).send({ message: 'Email is required.' })
        }
        // Always handle emails in lowercase on the backend
        email = email.toLowerCase()
    
        let password = ''
        if (_.has(req, 'body.input.password')) {
          password = req.body.input.password
        } else {
          return res.status(400).send({ message: 'Password is required.' })
        }

        const user = await prisma.users.findUnique({
          where: {
            email
          },
        })
        if (!user) {
          throw new Error('User not found!')
        }

        const passwordMatches = await bcrypt.compare(password, user.hashed_password)
        if (passwordMatches) {
          const token = generateTokenForUser(user)
          return res.send({ token, id: user.id })
        } else {
          return res.status(400).send({ message: 'Email or password did not match.' })
        }
      } catch (error) {
        console.error(error)
        if (error instanceof Error) {
          return res.status(400).send({ message: error.message })
        } else {
          return res.status(400).send({ message: error })
        }
      }
    })

    app.use('/hasura/actions/resendVerificationEmail', async (req: Request, res: Response) => {
      try {
        const user = await this.getUserForRequest(req)
        if (!user) {
          throw new Error('User not found!')
        }
        
        await sendVerificationEmail.add('send verification email for user id ' + user.id, new SendVerificationEmailJobData(user.id))

        res.json(true)
      } catch (error) {
        console.error(error)
        if (error instanceof Error) {
          return res.status(400).send({ message: error.message })
        } else {
          return res.status(400).send({ message: error })
        }
      }
    })

    app.use('/hasura/actions/verifyEmail', async (req: Request, res: Response) => {
      try {
        const code = req.body.input.code
        const user = await prisma.users.findFirstOrThrow({
          where: {
            email_verification_code: code,
          },
        })
        
        await prisma.users.update({
          where: {
            id: user.id,
          },
          data: {
            email_verification_code: null,
            email_verified: true
          },
        })
        
        res.json(true)
      } catch (error) {
        console.error(error)
        if (error instanceof Error) {
          return res.status(400).send({ message: error.message })
        } else {
          return res.status(400).send({ message: error })
        }
      }
    })
  }

  async shutdown () {
    // No shutdown actions for this controller
  }
}

const controller = new ActionsController()

export default controller
