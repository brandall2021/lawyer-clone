SELECT s.name AS sch, t.name AS tbl,
       SUM(p.row_count) AS nrows,
       CAST(SUM(p.used_page_count) * 8.0 / 1024 AS DECIMAL(12,1)) AS size_mb
FROM sys.tables t
JOIN sys.schemas s ON s.schema_id = t.schema_id
JOIN sys.dm_db_partition_stats p ON p.object_id = t.object_id AND p.index_id IN (0,1)
GROUP BY s.name, t.name
ORDER BY size_mb DESC;

SELECT 'TABLES'   AS kind, COUNT(*) AS n FROM sys.tables
UNION ALL SELECT 'VIEWS', COUNT(*) FROM sys.views
UNION ALL SELECT 'PROCEDURES', COUNT(*) FROM sys.procedures
UNION ALL SELECT 'FUNCTIONS', COUNT(*) FROM sys.objects WHERE type IN ('FN','IF','TF')
UNION ALL SELECT 'TRIGGERS', COUNT(*) FROM sys.triggers
UNION ALL SELECT 'FKS', COUNT(*) FROM sys.foreign_keys
UNION ALL SELECT 'INDEXES', COUNT(*) FROM sys.indexes WHERE type > 0;
