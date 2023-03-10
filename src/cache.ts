import { caching } from 'cache-manager'
import { ioRedisStore } from '@tirke/node-cache-manager-ioredis'

export const redisCache = caching(ioRedisStore, {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  // Note that bullmq connection uses db 0
  db: parseInt(process.env.CACHE_REDIS_DB || '1'),
  password: process.env.REDIS_PASSWORD || '',
  ttl: 1800
})

redisCache.then((cache) => {
  const client = cache.store.client

  client.on('error', (error) => {
    // handle error here
    console.log('~~ Cache redis client error', error)
  })
  
  client.on('connect', () => {
    console.log('~~ Cache connected')
  })
})
