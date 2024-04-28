/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { dbExecute, dbSelectOne } from './db'

export async function createTables (db) {
  let version
  try {
    const row = await dbSelectOne('SELECT version FROM version LIMIT 1', [], { db })
    version = row?.version ?? 0
  } catch (e) {
    console.log('createTables -- error getting version', e)
    version = 0
  }

  // if (version === 2) {
  //   // console.log('createTables -- using version 1')
  // } else if (version === 1) {
  // console.log('createTables -- creating version 2')
  if (version >= 1) {
    // await dbExecute('DROP TABLE lookups', [], { db })
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS lookups (
        category TEXT NOT NULL,
        subCategory TEXT,
        key TEXT NOT NULL,
        name TEXT,
        data TEXT,
        lat REAL,
        lon REAL,
        flags INTEGER,
        updated INTEGER,
        PRIMARY KEY (category, key)
      )`, [], { db })

    await dbExecute('UPDATE version SET version = 2', [], { db })
  } else if (version === 0) {
    // console.log('createTables -- creating version 1')
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS version (
        version INTEGER PRIMARY KEY NOT NULL
      )`, [], { db })
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS operations (
        uuid TEXT PRIMARY KEY NOT NULL,
        data TEXT
      )`, [], { db })
    await dbExecute(`
      CREATE TABLE IF NOT EXISTS qsos (
        key TEXT
        operation TEXT,
        ourCall TEXT,
        theirCall TEXT
        mode TEXT,
        band TEXT,
        startOnMillis INTEGER,
        data TEXT,
        PRIMARY KEY (key, operation)
      )`, [], { db })
    await dbExecute('DELETE FROM version', [], { db })
    await dbExecute('INSERT INTO version (version) VALUES (?)', [1], { db })
  }
}
