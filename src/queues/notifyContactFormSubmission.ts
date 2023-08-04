// Adding a new queue/worker?  Make sure to add them to QueueController.ts!

import { Queue, Worker, Job } from 'bullmq'
import queueRedisConnection from './queueRedisConnection'
import fs from 'fs-extra'
import Handlebars from 'handlebars'
import mjml2html from 'mjml'
import { sendEmail } from '../email'
import prisma from '../database'

const queueName = 'notifyContactFormSubmission'

const queue = new Queue(queueName, { connection: queueRedisConnection })

export class NotifyContactFormSubmissionJobData {
  submissionId = ''
  constructor(submissionId: string) {
    this.submissionId = submissionId;
  }
}

export const worker = new Worker(queueName, async job => {
  const submissionId = (job.data as NotifyContactFormSubmissionJobData).submissionId

  // Find the submission
  const submission = await prisma.contact_form_submissions.findUnique({
    where: {
      id: submissionId,
    },
  })
  if (!submission) {
    throw new Error('contact_form_submission message not found!')
  }

  const name = submission.name
  const email = submission.email
  const message = submission.message

  const mjml = await fs.readFile('./src/emails/contact_form_submission.mjml', 'utf8')
  const template = Handlebars.compile(mjml)
  const templateData = { name, email, message }
  const mjmlFilled = template(templateData)
  const mjmlOut = mjml2html(mjmlFilled)
  const htmlMessage = mjmlOut.html

  const subject = `AppName Contact Form Submission`
  const textMessage = `Name: ${name}\nEmail: ${email}\nMessage: ${message}`

  const recipients = []
  if (process.env.CONTACT_FORM_RECIPIENT_EMAILS) {
    for (const envRecipient of process.env.CONTACT_FORM_RECIPIENT_EMAILS.split(',')) {
      recipients.push(envRecipient)
    }
  } else {
    recipients.push('admin@AppName.com')
  }

  for (const recipeint of recipients) {
    await sendEmail(recipeint, subject, textMessage, htmlMessage, email)
  }

}, { connection: queueRedisConnection })

worker.on('completed', (job: Job, returnvalue: any) => {
  console.log(`~~ ${queueName} completed`, job.id, returnvalue)
})

worker.on('failed', (job: any, error: Error) => {
  console.error(`~~ ${queueName} failed`, job.id, error)
})

export default queue
