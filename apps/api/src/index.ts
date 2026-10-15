import 'dotenv/config'
import fastify from 'fastify'
import cors from '@fastify/cors'
import helmet from '@fastify/helmet'
import { healthRoutes } from './routes/health'
import { metaRoutes } from './routes/meta'
import { personasRoutes } from './routes/personas'
import { gestionesRoutes } from './routes/gestiones'
import { dataRoutes } from './routes/data'
import { statsRoutes } from './routes/stats'

const app = fastify({
  logger: {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
    },
  },
})

async function start() {
  await app.register(cors, { origin: true })
  await app.register(helmet)

  await app.register(healthRoutes, { prefix: '/api' })
  await app.register(metaRoutes, { prefix: '/api' })
  await app.register(personasRoutes, { prefix: '/api' })
  await app.register(gestionesRoutes, { prefix: '/api' })
  await app.register(dataRoutes, { prefix: '/api' })
  await app.register(statsRoutes, { prefix: '/api' })

  const port = Number(process.env.PORT) || 8080
  await app.listen({ port, host: '0.0.0.0' })
}

start().catch((err) => {
  app.log.error(err)
  process.exit(1)
})
