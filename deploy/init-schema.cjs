// Inicializa el esquema: prisma db push solo en BD vacia;
// luego asegura la tabla "Eventos" (derivada de HistGest sin HGObserv,
// ver README/db-export: se crea durante la migracion de datos).
const { PrismaClient } = require('@prisma/client')
const { execSync } = require('child_process')

const p = new PrismaClient()

async function main() {
  const t = await p.$queryRawUnsafe(
    `SELECT count(*)::int AS c FROM information_schema.tables WHERE table_schema='public'`
  )
  const n = t[0].c
  console.log(`[init-schema] tablas en public: ${n}`)
  if (n === 0) {
    console.log('[init-schema] esquema vacio, ejecutando prisma db push')
    execSync('npx prisma db push --skip-generate', {
      stdio: 'inherit',
      cwd: '/app/apps/api',
    })
  } else {
    console.log('[init-schema] esquema ya presente, no se ejecuta db push')
  }

  await p.$executeRawUnsafe(
    'CREATE TABLE IF NOT EXISTS "Eventos" (LIKE "HistGest" INCLUDING DEFAULTS INCLUDING GENERATED INCLUDING IDENTITY)'
  )
  await p.$executeRawUnsafe('ALTER TABLE "Eventos" DROP COLUMN IF EXISTS "HGObserv"')
  await p.$executeRawUnsafe(
    'ALTER TABLE "Eventos" ADD CONSTRAINT "pk_Eventos" PRIMARY KEY ("HGCodOri","HGCodigo")'
  )
  await p.$executeRawUnsafe(
    'CREATE INDEX IF NOT EXISTS "idx_Eventos_gestion" ON "Eventos" ("HGCodOriGes","HGCodGes")'
  )
  console.log('[init-schema] Eventos OK')
}

main()
  .then(() => p.$disconnect())
  .catch((e) => {
    console.error('[init-schema] ERROR', e)
    process.exit(1)
  })
