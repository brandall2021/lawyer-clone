import type { FastifyPluginAsync } from 'fastify'
import { prisma } from '../db'
import {
  getTables,
  getTable,
  ident,
  selectableColumns,
  textColumns,
  pkColumns,
} from '../lib/tables'

function normalize(value: unknown): unknown {
  if (typeof value === 'bigint') return Number(value)
  if (value instanceof Date) return value.toISOString()
  if (Buffer.isBuffer(value)) return value.toString('base64')
  if (Array.isArray(value)) return value.map(normalize)
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) out[k] = normalize(v)
    return out
  }
  return value
}

export const dataRoutes: FastifyPluginAsync = async (app) => {
  app.get('/data/tables', async () => {
    const tables = await getTables()
    const estimates = await prisma.$queryRaw<
      Array<{ relname: string; n_live_tup: number }>
    >`
      SELECT c.relname, GREATEST(c.reltuples, 0)::bigint AS n_live_tup
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relkind = 'r'
    `
    const counts = new Map(estimates.map((r) => [r.relname, Number(r.n_live_tup)]))
    return [...tables.values()]
      .map((t) => ({
        name: t.name,
        columns: t.columns.length,
        hasPk: t.hasPk,
        estimatedRows: counts.get(t.name) ?? 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name))
  })

  app.get('/data/table/:name', async (req, reply) => {
    const { name } = req.params as { name: string }
    const t = await getTable(name)
    if (!t) return reply.code(404).send({ error: 'unknown table' })
    return { name: t.name, hasPk: t.hasPk, pk: pkColumns(t), columns: t.columns }
  })

  app.get('/data/:table', async (req, reply) => {
    const { table } = req.params as { table: string }
    const { q, page, pageSize } = req.query as {
      q?: string
      page?: string
      pageSize?: string
    }
    const t = await getTable(table)
    if (!t) return reply.code(404).send({ error: 'unknown table' })

    const cols = selectableColumns(t)
    if (cols.length === 0) {
      return { total: 0, page: 1, pageSize: 0, orderBy: [], rows: [] }
    }

    const take = Math.min(Number(pageSize) || 50, 200)
    const p = Math.max(Number(page) || 1, 1)

    const params: unknown[] = []
    let where = ''
    const tc = textColumns(t)
    if (q && tc.length) {
      params.push(`%${q}%`)
      const idx = params.length
      where =
        'WHERE (' +
        tc.map((c) => `${ident(c)}::text ILIKE $${idx}`).join(' OR ') +
        ')'
    }

    const orderCols = pkColumns(t).length ? pkColumns(t) : [cols[0]]
    const orderBy = orderCols.map(ident).join(', ')
    const sel = cols.map(ident).join(', ')

    const countSql = `SELECT COUNT(*)::int AS n FROM ${ident(t.name)} ${where}`
    const rowsSql = `SELECT ${sel} FROM ${ident(t.name)} ${where} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`

    const [total, rows] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{ n: number }>>(countSql, ...params),
      prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
        rowsSql,
        ...params,
        take,
        (p - 1) * take
      ),
    ])

    return {
      total: total[0]?.n ?? 0,
      page: p,
      pageSize: take,
      orderBy: orderCols,
      rows: normalize(rows),
    }
  })

  app.get('/data/:table/row', async (req, reply) => {
    const { table } = req.params as { table: string }
    const t = await getTable(table)
    if (!t) return reply.code(404).send({ error: 'unknown table' })
    const pk = pkColumns(t)
    if (!pk.length) return reply.code(404).send({ error: 'table has no primary key' })

    const query = req.query as Record<string, string | undefined>
    const params: unknown[] = []
    const cond: string[] = []
    for (const c of pk) {
      const v = query[c]
      if (v === undefined) {
        return reply.code(400).send({ error: `missing pk param: ${c}` })
      }
      params.push(v)
      const udt = t.columns.find((c2) => c2.name === c)?.udt
      const cast = udt && /^[a-z_][a-z0-9_]*$/.test(udt) ? `::${udt}` : ''
      cond.push(`${ident(c)} = $${params.length}${cast}`)
    }

    const sel = selectableColumns(t).map(ident).join(', ')
    const rows = await prisma.$queryRawUnsafe<Array<Record<string, unknown>>>(
      `SELECT ${sel} FROM ${ident(t.name)} WHERE ${cond.join(' AND ')}`,
      ...params
    )
    if (!rows[0]) return reply.code(404).send({ error: 'not found' })
    return normalize(rows[0])
  })
}
