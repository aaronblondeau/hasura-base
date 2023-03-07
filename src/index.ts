import * as dotenv from 'dotenv'
dotenv.config()
import express from 'express'
import axios from 'axios'
import http from 'http'
import cors from 'cors'
import QueueController from './controllers/v1/QueueController'
import terminus from '@godaddy/terminus'
import Controller from './Controller'

const controllers : Array<Controller> = [
  QueueController
]

const app = express()
const server = http.createServer(app)

app.use(express.json())
app.use(cors())

for (const controller of controllers) {
  controller.startup(app)  
}

app.get('/readycheck', (req, res) => {
  res.send('ready')
})

app.all('/healthcheck', async (req, res) => {
  // Check network connection with hasura
  const hasuraCheck = await axios.get((process.env.HASURA_BASE_URL || 'http://localhost:8080') + '/v1/version')
  res.json({ healthy: true, hasura: hasuraCheck.data })
})

// Graceful shutdown - can be disabled with an env var
if (process.env.GRACEFUL_SHUTDOWN !== 'no') {
  console.log('~~ Enabling graceful shutdown')
  terminus.createTerminus(server, {
    signal: 'SIGINT',
    signals: ['SIGUSR1', 'SIGUSR2'],
    timeout: 31000,
    onSignal: async () => {
      // Cleanup all resources
      console.log('~~ Terminus signal : cleaning up...')

      for (const controller of controllers) {
        if (controller.shutdown) {
          await controller.shutdown()
        }
      }
    },
    onShutdown: async () => {
      console.log('~~ Terminus shutdown complete.')
    }
  })
}

const port = parseInt(process.env.PORT || '3000')
server.listen(port, () => console.log(`~~ API listening on port ${port}!`))
