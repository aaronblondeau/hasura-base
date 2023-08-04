import { Express, Request, Response } from 'express'
import Controller from './Controller'
import _ from 'lodash'
import multer from 'multer'
import multerS3 from 'multer-s3'
import { v4 as uuidv4 } from 'uuid'
import { verifyToken } from '../auth'
import prisma from '../database'
import { users } from '@prisma/client'
import { format } from 'date-fns'
import { Readable } from 'stream'
import sharp from 'sharp'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { s3ClientUserPublic } from '../files'

// https://www.npmjs.com/package/multer
// https://www.npmjs.com/package/multer-s3
// https://northflank.com/guides/connect-nodejs-to-minio-with-tls-using-aws-s3
// https://hasura.io/blog/building-file-upload-downloads-for-your-hasura-app/
// https://github.com/lovell/sharp

class FileStorageController implements Controller {

  async getUserForRequest(req: Request) : Promise<users> {
    // const userId = req.body.session_variables['x-hasura-user-id']
    const token = req.headers['authorization']?.split(' ')[1]
    if (!token) {
      throw new Error("Auth token is required")
    }
    
    const decoded = verifyToken(token)
    if (!decoded || !decoded.user_id) {
      throw new Error("Invalid auth token")
    }

    const userId = decoded.user_id

    const user = await prisma.users.findUnique({
      where: {
        id: userId,
      },
    })
    if (!user) {
      throw new Error("User not found")
    }
    return user
  }

  startup (app: Express) {

    const uploadUserAvatarsPublic = multer({
      storage: multerS3({
        s3: s3ClientUserPublic as any,
        bucket: process.env.S3_USER_PUBLIC_BUCKET || 'user-public',
        metadata: (req, file, cb) => {
          cb(null, {originalname: file.originalname})
        },
        contentType: (req, file, cb) => {
          cb(null, file.mimetype)
        },
        key: async (req: Request, file, cb) => {
          try {
            const uuid = uuidv4()
            const user = await this.getUserForRequest(req)
            const extension = file.originalname.split('.').pop()
            let fileKey = `${user.id}/${uuid}`;
            if (extension) {
              fileKey += `.${extension}`
            }

            (req as any).saved_files = [{
              bucket: process.env.S3_USER_PUBLIC_BUCKET || 'user-public',
              originalname: file.originalname,
              mimetype: file.mimetype,
              key: fileKey,
              size: file.size,
              endpoint: process.env.S3_ENDPOINT || 'http://localhost:9000',
              region: process.env.S3_REGION || 'us-east-1',
              userId: user.id
            }]

            cb(null, fileKey)
          } catch (err) {
            console.error(err)
            cb(err)
          }
        }
      })
    })

    // Route to store avatars - requires Auth token (Bearer)
    app.post('/files/user-avatar', uploadUserAvatarsPublic.single('avatar'), async (req: Request, res: Response) => {
      // Note, jwt is checked by multer middleware

      const file = (req as any).saved_files[0]

      await prisma.users.update({
        where: {
          id: file.userId,
        },
        data: {
          avatar_file_key: file.key,
        },
      })

      res.json(file)
    })

    // Route to fetch avatars - public
    app.get('/files/user-avatar/:userId/:fileId', async (req: Request, res: Response) => {
      const userId = req.params.userId
      const fileId = req.params.fileId
      const fileKey = `${userId}/${fileId}`
      const params = {
        Bucket: process.env.S3_USER_PUBLIC_BUCKET || 'user-public',
        Key: fileKey,
      }
      try {
        const result = await s3ClientUserPublic.send(new GetObjectCommand(params))

        // Serve plain file
        // res.setHeader('Content-Type', result.ContentType || '')
        // res.setHeader('Content-Length', result.ContentLength || '')
        // if (result.LastModified) {
        //   res.setHeader('Last-Modified', format(result.LastModified, 'EEE, dd MMM yyyy HH:mm:ss zzz'))
        // }
        // if (result.Body) {
        //   res.status(200);
        //   (result.Body as Readable).pipe(res)
        // } else {
        //   res.status(404).send('File not found')
        // }

        // Transform file with sharp
        if (result.Body) {
          res.status(200);
          const sharpEffect = sharp()
            .resize(200, 200)
            .png();
          res.type('image/png');
          (result.Body as Readable)
            .pipe(sharpEffect)
            .pipe(res);
        } else {
          res.status(404).send('File not found')
        }
      } catch (err) {
        console.error(err)
        res.status(404).send('File not found')
      }
    })
  }

  async shutdown () {
    // No shutdown actions for this controller
  }
}

const controller = new FileStorageController()

export default controller
