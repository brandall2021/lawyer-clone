SELECT t.name AS tbl, c.column_id AS ord, c.name AS col,
       ty.name AS dtype, c.max_length AS maxlen, c.precision AS prec, c.scale AS scale,
       c.is_nullable AS nullable, c.is_identity AS ident, c.is_computed AS computed,
       dc.definition AS default_def
FROM sys.tables t
JOIN sys.columns c ON c.object_id = t.object_id
JOIN sys.types ty ON ty.user_type_id = c.user_type_id
LEFT JOIN sys.default_constraints dc
       ON dc.parent_object_id = t.object_id AND dc.parent_column_id = c.column_id
ORDER BY t.name, c.column_id;

SELECT t.name AS tbl, i.name AS idx_name, i.type_desc AS idx_type,
       i.is_primary_key AS is_pk, i.is_unique AS is_unique,
       i.is_unique_constraint AS is_uq_con, i.has_filter AS has_filter, i.filter_definition AS filter_def
FROM sys.tables t
JOIN sys.indexes i ON i.object_id = t.object_id AND i.type > 0
ORDER BY t.name, i.index_id;

SELECT t.name AS tbl, i.name AS idx_name, ic.key_ordinal AS ord, ic.index_column_id AS colid,
       c.name AS col, ic.is_descending_key AS is_desc, ic.is_included_column AS is_incl
FROM sys.tables t
JOIN sys.indexes i ON i.object_id = t.object_id AND i.type > 0
JOIN sys.index_columns ic ON ic.object_id = i.object_id AND ic.index_id = i.index_id
JOIN sys.columns c ON c.object_id = ic.object_id AND c.column_id = ic.column_id
ORDER BY t.name, i.name, ic.key_ordinal, ic.index_column_id;

SELECT t.name AS tbl, cc.name AS ck_name, cc.definition AS ck_def
FROM sys.check_constraints cc
JOIN sys.tables t ON t.object_id = cc.parent_object_id
ORDER BY t.name, cc.name;

SELECT t.name AS tbl, ctx.name AS col, ctx.column_id AS col_id, ctx.definition AS computed_def
FROM sys.computed_columns ctx
JOIN sys.tables t ON t.object_id = ctx.object_id
ORDER BY t.name, ctx.column_id;
