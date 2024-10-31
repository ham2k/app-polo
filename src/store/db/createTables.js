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
    version = 0
  }

  if (version < 1) {
    console.log('createTables -- creating version 1')
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
        key TEXT NOT NULL,
        operation TEXT NOT NULL,
        ourCall TEXT,
        theirCall TEXT,
        mode TEXT,
        band TEXT,
        startOnMillis INTEGER,
        data TEXT,
        PRIMARY KEY (key, operation)
      )`, [], { db })
    await dbExecute('INSERT INTO version (version) VALUES (?)', [1], { db })
  }

  if (version < 2) {
    console.log('createTables -- creating version 2')
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
  }

  if (version < 3) {
    console.log('createTables -- creating version 3')
    // For a couple of weeks, we were saving `history` data in each QSO,
    // including recursive history, to the point of causing sqlite to slow down to a halt.
    // This migration removes that data in a simple query.
    await dbExecute(`
      UPDATE qsos SET data = json_remove(data, '$.their.lookup.history')
    `, [], { db })

    await dbExecute('UPDATE version SET version = 3', [], { db })
  }
}
