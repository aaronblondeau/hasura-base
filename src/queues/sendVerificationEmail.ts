// Adding a new queue/worker?  Make sure to add them to QueueController.ts!

import { Queue, Worker, Job } from 'bullmq'
import queueRedisConnection from './queueRedisConnection'
import prisma from '../database'
import { randomInt } from 'crypto'
import fs from 'fs-extra'
import Handlebars from 'handlebars'
import { sendEmail } from '../email'

const queueName = 'sendVerificationEmail'

const queue = new Queue(queueName, { connection: queueRedisConnection })

export class SendVerificationEmailJobData {
  userId = ''
  constructor(userId: string) {
    this.userId = userId;
  }
}

export const worker = new Worker(queueName, async job => {
  const userId = (job.data as SendVerificationEmailJobData).userId

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
      email_verification_code: code,
    },
  })

  // Send an email with a link containing the code

  const appName = process.env.APP_NAME || 'App Name'
  const verificationUrl = process.env.WEB_BASE_URL + '/verify-email/' + code

  const emailHtml = await fs.readFile('./src/emails/build_production/email-verify.html', 'utf8')
  const template = Handlebars.compile(emailHtml)
  const templateData = { appName, verificationUrl }
  const templateFilled = template(templateData)

  const subject = appName + ' verify your email'
  const textMessage = `Please visit ${verificationUrl} to verify your new ${appName} account.`
  
  await sendEmail(user.email, subject, textMessage, templateFilled)
}, { connection: queueRedisConnection })

worker.on('completed', (job: Job, returnvalue: any) => {
  console.log(`~~ ${queueName} completed`, job.id, returnvalue)
})

worker.on('failed', (job: any, error: Error) => {
  console.error(`~~ ${queueName} failed`, job.id, error)
})

export default queue