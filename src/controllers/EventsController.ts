import notifyContactFormSubmission, { NotifyContactFormSubmissionJobData } from '../queues/notifyContactFormSubmission'
import { Express, Request, Response } from 'express'
import Controller from './Controller'

class EventsController implements Controller {

  async wrapErrorHandler(code: () => Promise<any>, res: Response) {
    try {
      await code()
    } catch (error) {
      console.error(error)
      if (error instanceof Error) {
        return res.status(400).send({ message: error.message })
      } else {
        return res.status(400).send({ message: error })
      }
    }
  }

  startup (app: Express) {
    app.post('/hasura/events', async (req: Request, res: Response) => {
      await this.wrapErrorHandler(async () => {
        if (req.body.trigger.name === 'insert_contact_form_submission') {
          const submissionId = req.body.event.data.new.id
          await notifyContactFormSubmission.add('notify contact form submission ' + submissionId, { submissionId } as NotifyContactFormSubmissionJobData, {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 10000
            }
          })
        }
    
        return res.json({ success: `Thanks for the ${req.body.trigger.name} Hasura!`, at: new Date().toString() })
      }, res)
    })
  }

  async shutdown () {
    // No shutdown actions for this controller
  }
}

const controller = new EventsController()

export default controller
