import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'

const s3 = new S3Client({
  credentials: {
     accessKeyId: process.env.S3_ACCESS_KEY || '',
     secretAccessKey: process.env.S3_SECRET_KEY || ''
  },
  endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
  forcePathStyle: true,
  region: process.env.S3_REGION || 'us-east-1'
})

export default s3
