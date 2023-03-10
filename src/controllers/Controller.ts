import { Express } from 'express'

export default interface Controller {
  startup(app: Express) : void
  shutdown() : Promise<void>
}