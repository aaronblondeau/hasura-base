import IORedis from 'ioredis'

const connection = new IORedis({
  port: parseInt(process.env.REDIS_PORT || '6379'),
  host: process.env.REDIS_HOST || 'localhost',
  password: process.env.REDIS_PASSWORD || '',
  db: parseInt(process.env.ARENA_REDIS_DB || '0')
})
export default connection
