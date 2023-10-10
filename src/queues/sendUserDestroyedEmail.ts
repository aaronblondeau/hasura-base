// Adding a new queue/worker?  Make sure to add them to QueueController.ts!

import { Queue, Worker, Job } from 'bullmq'
import queueRedisConnection from './queueRedisConnection'
import fs from 'fs-extra'
import Handlebars from 'handlebars'
import { sendEmail } from '../email'

const queueName = 'sendUserDestroyedEmail'

const queue = new Queue(queueName, { connection: queueRedisConnection })

export class SendUserDestroyedEmailJobData {
  email = ''
  constructor(email: string) {
    this.email = email;
  }
}

export const worker = new Worker(queueName, async job => {
  const email = (job.data as SendUserDestroyedEmailJobData).email

  const appName = process.env.APP_NAME || 'App Name'

  const emailHtml = await fs.readFile('./src/emails/build_production/user-destroyed.html', 'utf8')
  const template = Handlebars.compile(emailHtml)
  const templateData = { appName }
  const templateFilled = template(templateData)

  const subject = appName + ' account destroyed'
  const textMessage = `Your ${appName} account has been destroyed.`
  
  await sendEmail(email, subject, textMessage, templateFilled)
}, { connection: queueRedisConnection })

worker.on('completed', (job: Job, returnvalue: any) => {
  console.log(`~~ ${queueName} completed`, job.id, returnvalue)
})

worker.on('failed', (job: any, error: Error) => {
  console.error(`~~ ${queueName} failed`, job.id, error)
})

export default queue