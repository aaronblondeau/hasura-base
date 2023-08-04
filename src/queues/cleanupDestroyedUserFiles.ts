// Adding a new queue/worker?  Make sure to add them to QueueController.ts!

import { Queue, Worker, Job } from 'bullmq'
import queueRedisConnection from './queueRedisConnection'
import { s3ClientUserPublic } from '../files'
import { ListObjectsV2Command, DeleteObjectsCommand } from '@aws-sdk/client-s3'

const queueName = 'cleanupDestroyedUserFiles'

const queue = new Queue(queueName, { connection: queueRedisConnection })

export class CleanupDestroyedUserFilesJobData {
  userId = ''
  constructor(userId: string) {
    this.userId = userId;
  }
}

export const worker = new Worker(queueName, async job => {
  const userId = (job.data as CleanupDestroyedUserFilesJobData).userId

  // Delete all files with prefix from s3 bucket
  // https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_ListObjects_section.html
  const listCommand = new ListObjectsV2Command({
    Bucket: process.env.S3_USER_PUBLIC_BUCKET || 'user-public',
    Prefix: `${userId}/`,
    MaxKeys: 100,
  })

  let isTruncated = true
  while (isTruncated) {
    const objectsToDelete = []

    const { Contents, IsTruncated, NextContinuationToken } = await s3ClientUserPublic.send(listCommand)
    if (Contents) {
      for (const object of Contents) {
        console.log(`~~ Adding to file delete list ${object.Key}`)
        objectsToDelete.push({
          Key: object.Key,
        })
      }
    }
    isTruncated = IsTruncated || false
    listCommand.input.ContinuationToken = NextContinuationToken

    if (objectsToDelete.length > 0) {
      // https://docs.aws.amazon.com/AmazonS3/latest/userguide/example_s3_DeleteObjects_section.html
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: process.env.S3_USER_PUBLIC_BUCKET || 'user-public',
        Delete: {
          Objects: objectsToDelete,
        },
      })
      const { Deleted } = await s3ClientUserPublic.send(deleteCommand);
      if (Deleted) {
        console.log(
          `~~ Successfully deleted ${Deleted.length} objects from user avatars bucket for ${userId}.`
        )
      }
    }
  }
}, { connection: queueRedisConnection })

worker.on('completed', (job: Job, returnvalue: any) => {
  console.log(`~~ ${queueName} completed`, job.id, returnvalue)
})

worker.on('failed', (job: any, error: Error) => {
  console.error(`~~ ${queueName} failed`, job.id, error)
})

export default queue