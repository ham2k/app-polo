/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import UUID from 'react-native-uuid'
import RNFetchBlob from 'react-native-blob-util'

import { dbExecute, dbSelectAll, dbSelectOne } from './db'
import { logTimer } from '../../tools/perfTools'
import { Platform } from 'react-native'

export async function createTables (dbParams = {}) {
  let version
  try {
    const row = await dbSelectOne('SELECT version FROM version ORDER BY version DESC LIMIT 1', [], dbParams)
    version = row?.version ?? 0
    console.log('DB Version ', version)
  } catch (e) {
    version = 0
    console.log('No existing DB')
  }

  if (version === 0) {
    console.log('createTables -- creating version 4')
    await dbExecute(`
        CREATE TABLE IF NOT EXISTS version (
          version INTEGER PRIMARY KEY NOT NULL
        )`, [], dbParams)
    await dbExecute(`
        CREATE TABLE IF NOT EXISTS operations (
          uuid TEXT PRIMARY KEY NOT NULL,
          data TEXT
        )`, [], dbParams)
    await dbExecute(`
        CREATE TABLE IF NOT EXISTS qsos (
          uuid TEXT PRIMARY KEY NOT NULL,
          operation TEXT NOT NULL,
          key TEXT,
          ourCall TEXT,
          theirCall TEXT,
          mode TEXT,
          band TEXT,
          startOnMillis INTEGER,
          data TEXT
        )`, [], dbParams)
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
        )`, [], dbParams)
    await dbExecute('INSERT INTO version (version) VALUES (?)', [4], dbParams)
  } else {
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
          )`, [], dbParams)

      await dbExecute('UPDATE version SET version = 2', [], dbParams)
    }

    if (version < 3) {
      console.log('createTables -- creating version 3')
      // For a couple of weeks, we were saving `history` data in each QSO,
      // including recursive history, to the point of causing sqlite to slow down to a halt.
      // This migration removes that data in a simple query.
      await dbExecute(`
          UPDATE qsos SET data = json_remove(data, '$.their.lookup')
        `, [], dbParams)

      await dbExecute('UPDATE version SET version = 3', [], dbParams)
    }

    if (version < 4) {
      // We're adding uuids for QSOs, and replacing the current `key`
      // But since this requires changing the primary key, we need to create a new table
      // and copy the data over.

      let file
      if (Platform.OS === 'ios') {
        file = `${RNFetchBlob.fs.dirs.DocumentDir}/../Library/NoCloud/polo.sqlite`
      } else if (Platform.OS === 'android') {
        file = `${RNFetchBlob.fs.dirs.DocumentDir}/polo.sqlite`
      }
      try { await RNFetchBlob.fs.unlink(`${file}.v3`) } catch (e) {}
      await RNFetchBlob.fs.cp(file, `${file}.v3`)

      console.log('createTables -- creating version 4')
      logTimer('migration4', 'Alter table')
      await dbExecute(`
            ALTER TABLE qsos ADD COLUMN uuid TEXT
          `, [], { dbParams })
      let qsos
      while (!qsos || qsos.length > 0) {
        logTimer('migration4', 'New uuid batch')
        qsos = await dbSelectAll(`
              SELECT * FROM qsos WHERE uuid IS NULL LIMIT 1000
            `, [], { dbParams })
        for (const qso of qsos) {
          await dbExecute(`
                UPDATE qsos SET uuid = ? WHERE key = ? AND operation = ?
              `, [UUID.v1(), qso.key, qso.operation], { dbParams })
        }
      }
      await dbExecute(`
        CREATE TABLE IF NOT EXISTS qsos_new (
          uuid TEXT PRIMARY KEY NOT NULL,
          operation TEXT NOT NULL,
          key TEXT,
          ourCall TEXT,
          theirCall TEXT,
          mode TEXT,
          band TEXT,
          startOnMillis INTEGER,
          data TEXT
        )`, [], dbParams)
      logTimer('migration4', 'Create new table')
      await dbExecute(`
        INSERT INTO qsos_new (uuid, operation, key, ourCall, theirCall, mode, band, startOnMillis, data)
          SELECT uuid, operation, key, ourCall, theirCall, mode, band, startOnMillis, data FROM qsos
        `, [], dbParams)
      logTimer('migration4', 'Copy data')
      await dbExecute('DROP TABLE qsos', [], dbParams)
      logTimer('migration4', 'Drop old table')
      await dbExecute('ALTER TABLE qsos_new RENAME TO qsos', [], dbParams)
      logTimer('migration4', 'Rename new table')
      await dbExecute('UPDATE version SET version = 4', [], dbParams)
      logTimer('migration4', 'End of transaction')
    }

    // TODO: Uncomment this block when we're close to releasing the December '24 version
    // if (version < 5) {
    //   console.log('createTables -- creating version 4')
    //   await dbExecute(`
    //     ALTER TABLE qsos RENAME COLUMN startedOnMillis TO startedAtMillis
    //   `, [], { db })

    //   await dbExecute('UPDATE version SET version = 4', [], dbParams)
    // }
  }
}
