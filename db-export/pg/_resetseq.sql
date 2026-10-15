DO $$
DECLARE r record; n int := 0;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
    FROM information_schema.columns c
    WHERE c.is_identity = 'YES' AND c.table_schema = 'public'
  LOOP
    BEGIN
      EXECUTE format(
        'SELECT setval(pg_get_serial_sequence(%L,%L), COALESCE((SELECT MAX(%I) FROM %I),1), (SELECT MAX(%I) IS NOT NULL FROM %I))',
        '"' || r.table_name || '"',
        r.column_name,
        r.column_name, r.table_name,
        r.column_name, r.table_name
      );
      n := n + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'skip %.%: %', r.table_name, r.column_name, SQLERRM;
    END;
  END LOOP;
  RAISE NOTICE 'identity sequences reset: %', n;
END $$;
