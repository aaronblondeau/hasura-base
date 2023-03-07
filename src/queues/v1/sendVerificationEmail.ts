// Adding a new queue/worker?  Make sure to add them to QueueController.ts!

import { Queue, Worker, Job } from 'bullmq'
import queueRedisConnection from './queueRedisConnection'

const queueName = 'v1-sendVerificationEmail'

const queue = new Queue(queueName, { connection: queueRedisConnection })

export const worker = new Worker(queueName, async job => {
  console.log('~~ Would execute job', queueName, job)
}, {
  connection: queueRedisConnection
})

worker.on('completed', (job: Job, returnvalue: any) => {
  console.log(`~~ ${queueName} completed`, job.id, returnvalue)
})

worker.on('failed', (job: any, error: Error) => {
  console.error(`~~ ${queueName} failed`, job.id, error)
})

export default queue