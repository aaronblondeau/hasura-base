const connection = {
  port: parseInt(process.env.REDIS_PORT || '6379'),
  host: process.env.REDIS_HOST || 'localhost',
  password: process.env.REDIS_PASSWORD || '',
  // Note, cache uses db 1
  db: parseInt(process.env.ARENA_REDIS_DB || '0')
}
export default connection
