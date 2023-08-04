import { ExpressAdapter, createBullBoard, BullMQAdapter } from '@bull-board/express'
import { Queue, Worker } from 'bullmq'
import { Express } from 'express'
import Controller from './Controller'
import basicAuth from 'express-basic-auth'

import sendVerificationEmail, { worker as sendVerificationEmailWorker } from '../queues/sendVerificationEmail'
import sendPasswordResetEmail, { worker as sendPasswordResetEmailWorker } from '../queues/sendPasswordResetEmail'
import sendPasswordChangedEmail, { worker as sendPasswordChangedEmailWorker } from '../queues/sendPasswordChangedEmail'
import sendUserDestroyedEmail, { worker as sendUserDestroyedEmailWorker } from '../queues/sendUserDestroyedEmail'
import cleanupDestroyedUserFiles, { worker as cleanupDestroyedUserFilesWorker } from '../queues/cleanupDestroyedUserFiles'
import notifyContactFormSubmission, { worker as notifyContactFormSubmissionWorker } from '../queues/notifyContactFormSubmission'

const queues: Array<Queue> = [
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendPasswordChangedEmail,
  sendUserDestroyedEmail,
  cleanupDestroyedUserFiles,
  notifyContactFormSubmission
]
const workers: Array<Worker> = [
  sendVerificationEmailWorker,
  sendPasswordResetEmailWorker,
  sendPasswordChangedEmailWorker,
  sendUserDestroyedEmailWorker,
  cleanupDestroyedUserFilesWorker,
  notifyContactFormSubmissionWorker
]

const adapters: Array<BullMQAdapter> = []
for (const queue of queues) {
  adapters.push(new BullMQAdapter(queue))
}

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');
createBullBoard({
  queues: adapters,
  serverAdapter,
})

class QueueController implements Controller {
  startup (app: Express) {
    app.use('/admin/queues',
      basicAuth({
        users: { [process.env.QUEUE_UI_USER || 'bullboard'] : process.env.QUEUE_UI_PASS || 'supersecret' },
        challenge: true
      }),
      serverAdapter.getRouter())
  }

  async shutdown () {
    for (const worker of workers) {
      await worker.close()
    }
  }
}

const controller = new QueueController()

export default controller
