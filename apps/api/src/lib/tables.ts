import { prisma } from '../db'

export type ColumnMeta = {
  name: string
  dataType: string
  udt: string
  nullable: boolean
  position: number
  isPk: boolean
}

export type TableMeta = {
  name: string
  columns: ColumnMeta[]
  hasPk: boolean
}

type Cache = {
  tables: Map<string, TableMeta>
  builtAt: number
}

let cache: Cache | null = null

const BINARY_TYPES = new Set(['bytea'])

export async function getTables(): Promise<Map<string, TableMeta>> {
  if (cache && Date.now() - cache.builtAt < 30_000) return cache.tables

  const cols = await prisma.$queryRaw<
    Array<{
      table_name: string
      column_name: string
      data_type: string
      udt_name: string
      is_nullable: string
      ordinal_position: number
    }>
  >`
    SELECT c.table_name, c.column_name, c.data_type, c.udt_name,
           c.is_nullable, c.ordinal_position
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_name = c.table_name AND t.table_schema = c.table_schema
    WHERE c.table_schema = 'public' AND t.table_type = 'BASE TABLE'
    ORDER BY c.table_name, c.ordinal_position
  `

  const pkRows = await prisma.$queryRaw<
    Array<{ table_name: string; column_name: string }>
  >`
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON kcu.constraint_name = tc.constraint_name
     AND kcu.table_schema = tc.table_schema
     AND kcu.table_name = tc.table_name
    WHERE tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
  `

  const pk = new Map<string, Set<string>>()
  for (const r of pkRows) {
    if (!pk.has(r.table_name)) pk.set(r.table_name, new Set())
    pk.get(r.table_name)!.add(r.column_name)
  }

  const tables = new Map<string, TableMeta>()
  for (const c of cols) {
    if (!tables.has(c.table_name)) {
      tables.set(c.table_name, { name: c.table_name, columns: [], hasPk: false })
    }
    const t = tables.get(c.table_name)!
    t.columns.push({
      name: c.column_name,
      dataType: c.data_type,
      udt: c.udt_name,
      nullable: c.is_nullable === 'YES',
      position: c.ordinal_position,
      isPk: pk.get(c.table_name)?.has(c.column_name) ?? false,
    })
  }
  for (const t of tables.values()) t.hasPk = t.columns.some((c) => c.isPk)

  cache = { tables, builtAt: Date.now() }
  return tables
}

export async function getTable(name: string): Promise<TableMeta | null> {
  const tables = await getTables()
  return tables.get(name) ?? null
}

export function ident(s: string): string {
  return '"' + s.replace(/"/g, '""') + '"'
}

export function selectableColumns(t: TableMeta): string[] {
  return t.columns
    .filter((c) => !BINARY_TYPES.has(c.udt))
    .map((c) => c.name)
}

export function textColumns(t: TableMeta): string[] {
  return t.columns
    .filter((c) =>
      ['character varying', 'text', 'character', 'uuid'].includes(c.dataType)
    )
    .map((c) => c.name)
}

export function pkColumns(t: TableMeta): string[] {
  return t.columns.filter((c) => c.isPk).map((c) => c.name)
}
