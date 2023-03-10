// Adding a new queue/worker?  Make sure to add them to QueueController.ts!

import { Queue, Worker, Job } from 'bullmq'
import queueRedisConnection from './queueRedisConnection'
import prisma from '../database'
import { randomInt } from 'crypto'
import fs from 'fs-extra'
import Handlebars from 'handlebars'
import mjml2html from 'mjml'
import { sendEmail } from '../email'

const queueName = 'sendPasswordChangedEmail'

const queue = new Queue(queueName, { connection: queueRedisConnection })

export class SendPasswordChangedEmailJobData {
  userId = ''
  constructor(userId: string) {
    this.userId = userId;
  }
}

export const worker = new Worker(queueName, async job => {
  const userId = (job.data as SendPasswordChangedEmailJobData).userId

  // Find the user
  const user = await prisma.users.findUnique({
    where: {
      id: userId,
    },
  })
  if (!user) {
    throw new Error('User not found!')
  }

  const appName = process.env.APP_NAME || 'App Name'

  const mjml = await fs.readFile('./src/emails/password_changed.mjml', 'utf8')
  const template = Handlebars.compile(mjml)
  const templateData = { appName }
  const mjmlFilled = template(templateData)
  const mjmlOut = mjml2html(mjmlFilled)
  const htmlMessage = mjmlOut.html

  const subject = appName + ' password changed'
  const textMessage = `Your ${appName} password has been changed. If this action was not taken by you then please contact us immediately.`
  
  await sendEmail(user.email, subject, textMessage, htmlMessage)
}, { connection: queueRedisConnection })

worker.on('completed', (job: Job, returnvalue: any) => {
  console.log(`~~ ${queueName} completed`, job.id, returnvalue)
})

worker.on('failed', (job: any, error: Error) => {
  console.error(`~~ ${queueName} failed`, job.id, error)
})

export default queue