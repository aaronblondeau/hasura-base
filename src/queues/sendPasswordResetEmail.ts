// Adding a new queue/worker?  Make sure to add them to QueueController.ts!

import { Queue, Worker, Job } from 'bullmq'
import queueRedisConnection from './queueRedisConnection'
import prisma from '../database'
import { randomInt } from 'crypto'
import fs from 'fs-extra'
import Handlebars from 'handlebars'
import { sendEmail } from '../email'

const queueName = 'sendPasswordResetEmail'

const queue = new Queue(queueName, { connection: queueRedisConnection })

export class SendPasswordResetEmailJobData {
  userId = ''
  constructor(userId: string) {
    this.userId = userId;
  }
}

export const worker = new Worker(queueName, async job => {
  const userId = (job.data as SendPasswordResetEmailJobData).userId

  // Find the user
  const user = await prisma.users.findUnique({
    where: {
      id: userId,
    },
  })
  if (!user) {
    throw new Error('User not found!')
  }

  // Generate a new code and save it to their record
  const code = randomInt(1000_000).toString().padStart(6, '0')
  await prisma.users.update({
    where: {
      id: userId,
    },
    data: {
      password_reset_code: code,
    },
  })

  // Send an email with a link containing the code

  const appName = process.env.APP_NAME || 'App Name'
  const resetPasswordUrl = process.env.WEB_BASE_URL + '/reset-password/' + code

  const emailHtml = await fs.readFile('./src/emails/build_production/password-reset.html', 'utf8')
  const template = Handlebars.compile(emailHtml)
  const templateData = { appName, resetPasswordUrl }
  const templateFilled = template(templateData)

  const subject = appName + ' password reset request'
  const textMessage = `Please visit ${resetPasswordUrl} to reset your ${appName} password.`
  
  await sendEmail(user.email, subject, textMessage, templateFilled)
}, { connection: queueRedisConnection })

worker.on('completed', (job: Job, returnvalue: any) => {
  console.log(`~~ ${queueName} completed`, job.id, returnvalue)
})

worker.on('failed', (job: any, error: Error) => {
  console.error(`~~ ${queueName} failed`, job.id, error)
})

export default queue