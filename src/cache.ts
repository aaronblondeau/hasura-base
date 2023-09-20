import Redis from 'ioredis'

const redis = new Redis({
  port: parseInt(process.env.REDIS_PORT || '6379'),
  host: process.env.REDIS_HOST || 'localhost',
  username: process.env.REDIS_USERNAME || '', // needs Redis >= 6
  password: process.env.REDIS_PASSWORD,
  // Note that bullmq connection uses db 0
  db: parseInt(process.env.CACHE_REDIS_DB || '1'),
})

class Cache {
  redis: Redis

  constructor(redis: Redis) {
    this.redis = redis
  }

  async get(key: string) : Promise<string | null> {
    return await redis.get(key)
  }

  async set(key: string, value: string, ttl: number = 1800) {
    await redis.set(key, value, "EX", ttl)
  }

  async flushPrefix(prefix: string) {
    const keys = await redis.keys(prefix + '*')
    if (keys.length > 0) {
      await redis.del(keys)
    }
  }

  disconnect() {
    redis.disconnect()
  }
}

redis.on('error', (error) => {
  // handle error here
  console.log('~~ Cache redis client error', error)
})

redis.on('connect', () => {
  console.log('~~ Cache connected')
})

const cache = new Cache(redis)
export default cache
