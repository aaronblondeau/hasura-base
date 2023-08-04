import { S3Client } from '@aws-sdk/client-s3'

const s3ClientUserPublicConfig = {
  credentials: {
     accessKeyId: process.env.S3_ACCESS_KEY || '',
     secretAccessKey: process.env.S3_SECRET_KEY || ''
  },
  region: process.env.S3_USER_PUBLIC_REGION || 'us-east-1'
} as any
if (process.env.S3_USER_PUBLIC_ENDPOINT) {
  // MINIO
  s3ClientUserPublicConfig.forcePathStyle = true
  s3ClientUserPublicConfig.endpoint = process.env.S3_USER_PUBLIC_ENDPOINT
}
export const s3ClientUserPublic = new S3Client(s3ClientUserPublicConfig)
