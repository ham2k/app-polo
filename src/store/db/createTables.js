import { dbExecute, dbSelectOne } from './db'

export async function createTables (db) {
  let version
  try {
    const row = await dbSelectOne('SELECT version FROM version LIMIT 1', [], { db })
    version = row?.version ?? 0
  } catch (e) {
    version = 0
  }

  if (version === 1) {
    console.log('createTables -- using version 1')
  } else if (version === 0) {
    console.log('createTables -- creating version 1')
    await dbExecute(`
                CREATE TABLE IF NOT EXISTS version (
                  version INTEGER PRIMARY KEY NOT NULL
                )`, [], { db })
    await dbExecute(`
                CREATE TABLE IF NOT EXISTS operations (
                  uuid VARCHAR(64) PRIMARY KEY NOT NULL,
                  data TEXT
                )`, [], { db })
    await dbExecute(`
                CREATE TABLE IF NOT EXISTS qsos (
                  key VARCHAR(32),
                  op_uuid VARCHAR(64),
                  our_call VARCHAR(32),
                  their_call VARCHAR(32),
                  mode VARCHAR(32),
                  band VARCHAR(8),
                  start_on INTEGER,
                  data TEXT,
                  PRIMARY KEY (key, op_uuid)
                )`, [], { db })
    await dbExecute('DELETE FROM version', [], { db })
    await dbExecute('INSERT INTO version (version) VALUES (?)', [1], { db })
  }
}
