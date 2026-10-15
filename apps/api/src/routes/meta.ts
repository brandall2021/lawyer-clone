import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db'
import { getDecoders } from '../lib/decode'

export const metaRoutes: FastifyPluginAsync = async (app) => {
  app.get('/meta/decoders', async () => {
    return getDecoders()
  })

  app.get('/meta/forms', async () => {
    return prisma.listForm.findMany({ take: 1000 })
  })

  app.get('/meta/forms/:ori/:codigo/spec', async (req) => {
    const { ori, codigo } = req.params as { ori: string; codigo: string }
    const LCCodOri = Number(ori)
    const LCCodForm = Number(codigo)
    const [form, cols, bands] = await Promise.all([
      prisma.listForm.findUnique({
        where: {
          LFCodOri_LFCodigo: { LFCodOri: LCCodOri, LFCodigo: LCCodForm },
        },
      }),
      prisma.listColu.findMany({
        where: { LCCodOri, LCCodForm },
        orderBy: { LCItem: 'asc' },
      }),
      prisma.listBand.findMany({
        where: { LBCodOri: LCCodOri, LBCodForm: LCCodForm },
      }),
    ])
    return { form, cols, bands }
  })

  app.get('/meta/config', async () => {
    return prisma.dBConfig.findMany({ take: 1000 })
  })
}
