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
import { fmtTimestamp } from '../../tools/timeFormats'
import { queryOperations } from '../operations'

const CURRENT_VERSION = 9

export async function createTables(dbParams = {}) {
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
    // Create tables from scratch
    console.log('createTables -- creating version 7')
    await dbExecute(`
        CREATE TABLE IF NOT EXISTS version (
          version INTEGER PRIMARY KEY NOT NULL
        )`, [], dbParams)
    await dbExecute(`
        CREATE TABLE IF NOT EXISTS operations (
          uuid TEXT PRIMARY KEY NOT NULL,
          data TEXT,
          localData TEXT,
          startAtMillisMin INTEGER,
          startAtMillisMax INTEGER,
          qsoCount INTEGER,
          deleted BOOLEAN DEFAULT false,
          synced BOOLEAN DEFAULT false
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
          data TEXT,
          deleted BOOLEAN DEFAULT false,
          synced BOOLEAN DEFAULT false
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
    await dbExecute('INSERT INTO version (version) VALUES (?)', [CURRENT_VERSION], dbParams)
  } else {
    // Upgrade from current version
    if (version < 2) {
      // 2024-05-19 - 0.7.7 (pre 2)
      // Added a lookup table to store references for parks, summits, etc.
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
      // 2024-10-31 - November '24 (pre 7)
      // For a couple of weeks, we were saving `history` data in each QSO,
      // including recursive history, to the point of causing sqlite to slow down to a halt.
      // This migration removes that data in a simple query.
      console.log('createTables -- creating version 3')
      await dbExecute(`
          UPDATE qsos SET data = json_remove(data, '$.their.lookup')
        `, [], dbParams)

      await dbExecute('UPDATE version SET version = 3', [], dbParams)
    }

    if (version < 4) {
      // 2024-11-25 - December '24 (pre 3)
      // We're adding uuids for QSOs, and replacing the current `key`
      // But since this requires changing the primary key, we need to create a new table
      // and copy the data over.

      let file
      if (Platform.OS === 'ios') {
        file = `${RNFetchBlob.fs.dirs.DocumentDir}/../Library/NoCloud/polo.sqlite`
      } else if (Platform.OS === 'android') {
        file = `${RNFetchBlob.fs.dirs.DocumentDir}/polo.sqlite`
      }
      try { await RNFetchBlob.fs.unlink(`${file}.v3`) } catch (e) { }
      await RNFetchBlob.fs.cp(file, `${file}.v3`)

      console.log('createTables -- creating version 4')
      logTimer('migration4', 'Alter table')
      await dbExecute(`
            ALTER TABLE qsos ADD COLUMN uuid TEXT
          `, [], { ...dbParams, ignoreError: 'duplicate column name' })
      let qsos
      while (!qsos || qsos.length > 0) {
        logTimer('migration4', 'New uuid batch')
        qsos = await dbSelectAll(`
              SELECT * FROM qsos WHERE uuid IS NULL LIMIT 1000
            `, [], dbParams)
        for (const qso of qsos) {
          await dbExecute(`
                UPDATE qsos SET uuid = ? WHERE key = ? AND operation = ?
              `, [UUID.v4(), qso.key, qso.operation], dbParams)
        }
      }
      const uuidSuffix = UUID.v4().split('-').slice(1).join('-')
      await dbExecute(`
            UPDATE qsos SET uuid = lower(hex(randomblob(4))) || "-" || ?
          `, [uuidSuffix], { dbParams })
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

    if (version < 5) {
      // 2024-12-01 - December '24 (pre 5)
      console.log('createTables -- creating version 5')
      await dbExecute(`
        ALTER TABLE operations ADD COLUMN synced BOOLEAN DEFAULT false
      `, [], { ...dbParams, ignoreError: 'duplicate column name' })
      await dbExecute(`
        ALTER TABLE qsos ADD COLUMN synced BOOLEAN DEFAULT false
      `, [], { ...dbParams, ignoreError: 'duplicate column name' })

      await dbExecute('UPDATE version SET version = 5', [], dbParams)
    }

    if (version < 6) {
      // 2024-12-01 - December '24 (pre 5)
      console.log('createTables -- creating version 6')
      await dbExecute(`
        ALTER TABLE operations ADD COLUMN startAtMillisMin INTEGER DEFAULT 0
      `, [], { ...dbParams, ignoreError: 'duplicate column name' })
      await dbExecute(`
        ALTER TABLE operations ADD COLUMN startAtMillisMax INTEGER DEFAULT 0
      `, [], { ...dbParams, ignoreError: 'duplicate column name' })
      await dbExecute(`
        ALTER TABLE operations ADD COLUMN qsoCount INTEGER DEFAULT 0
      `, [], { ...dbParams, ignoreError: 'duplicate column name' })

      await dbExecute(`
        UPDATE operations SET
          startAtMillisMin = json_extract(data, "$.startAtMillisMin"),
          startAtMillisMax = json_extract(data, "$.startAtMillisMax"),
          qsoCount = json_extract(data, "$.qsoCount")
      `, [], dbParams)
      await dbExecute(`
        UPDATE operations SET
          startAtMillisMin = json_extract(data, "$.startOnMillisMin")
        WHERE startAtMillisMin = 0 OR startAtMillisMin IS NULL
      `, [], dbParams)
      await dbExecute(`
        UPDATE operations SET
          startAtMillisMax = json_extract(data, "$.startOnMillisMax")
        WHERE startAtMillisMax = 0 OR startAtMillisMax IS NULL
      `, [], dbParams)

      await dbExecute('UPDATE version SET version = 6', [], dbParams)
    }

    if (version < 7) {
      // 2024-12-03 - December '24 (pre 6)
      console.log('createTables -- creating version 7')
      await dbExecute(`
        ALTER TABLE operations ADD COLUMN localData TEXT
      `, [], { ...dbParams, ignoreError: 'duplicate column name' })
      await dbExecute(`
        ALTER TABLE operations ADD COLUMN deleted BOOLEAN DEFAULT false
      `, [], { ...dbParams, ignoreError: 'duplicate column name' })
      await dbExecute(`
        ALTER TABLE qsos ADD COLUMN deleted BOOLEAN DEFAULT false
      `, [], { ...dbParams, ignoreError: 'duplicate column name' })

      await dbExecute(`
        UPDATE qsos SET
          deleted = ifnull(json_extract(data, "$.deleted"), false)
      `, [], dbParams)

      await dbExecute('UPDATE version SET version = 7', [], dbParams)
    }

    if (version < 8) {
      // There's a small chance that tables were copied without an index in `clearAllOperationData`
      // so we have to add them back.
      console.log('createTables -- creating version 8')
      const timestamp = fmtTimestamp(Date.now())

      const qsosIndex = await dbSelectAll("SELECT name FROM sqlite_master WHERE type='index' AND name IN ('sqlite_autoindex_qsos_1', 'replacement_autoindex_qsos_1')")
      if (qsosIndex.length === 0) {
        const dupeIds = await dbSelectAll("SELECT uuid FROM qsos GROUP BY uuid HAVING COUNT(*) > 1")
        for (const dupeId of dupeIds) {
          const rows = await dbSelectAll("SELECT * FROM qsos WHERE uuid = ?", [dupeId.uuid], dbParams)
          // Sort rows based on the `updatedAtMillis` attribute in the JSON `data` column
          // The row with the highest `updatedAtMillis` is assumed to be the most recent,
          // so we will preserve only the latest record.
          rows.sort((a, b) => {
            const aUpdated = (() => { try { return JSON.parse(a.data)?.updatedAtMillis ?? 0 } catch { return 0 } })()
            const bUpdated = (() => { try { return JSON.parse(b.data)?.updatedAtMillis ?? 0 } catch { return 0 } })()
            return bUpdated - aUpdated
          })
          for (let i = 1; i < rows.length; i++) {
            await dbExecute('DELETE FROM qsos WHERE uuid = ? AND data = ?', [dupeId.uuid, rows[i].data], dbParams)
          }
        }
        await dbExecute(`CREATE UNIQUE INDEX replacement_${timestamp}_qsos_1 ON qsos(uuid)`)
      }

      const operationsIndex = await dbSelectAll("SELECT name FROM sqlite_master WHERE type='index' AND name IN ('sqlite_autoindex_operations_1', 'replacement_autoindex_operations_1')")
      if (operationsIndex.length === 0) {
        const dupeIds = await dbSelectAll("SELECT uuid FROM operations GROUP BY uuid HAVING COUNT(*) > 1")
        for (const dupeId of dupeIds) {
          const rows = await dbSelectAll("SELECT * FROM operations WHERE uuid = ?", [dupeId.uuid], dbParams)
          rows.sort((a, b) => {
            const aUpdated = (() => { try { return JSON.parse(a.data)?.updatedAtMillis ?? 0 } catch { return 0 } })()
            const bUpdated = (() => { try { return JSON.parse(b.data)?.updatedAtMillis ?? 0 } catch { return 0 } })()
            return bUpdated - aUpdated
          })
          for (let i = 1; i < rows.length; i++) {
            await dbExecute('DELETE FROM operations WHERE uuid = ? AND data = ?', [dupeId.uuid, rows[i].data], dbParams)
          }
        }

        await dbExecute(`CREATE UNIQUE INDEX replacement_${timestamp}_operations_1 ON operations(uuid)`)
      }

      await dbExecute('UPDATE version SET version = 8', [], dbParams)
    }

    if (version < 9) {
      // We're consolidating ECA and BCA into WCA
      const operations = await queryOperations('WHERE data LIKE "%ecaActivation%" OR data LIKE "%bcaActivation%"', [])
      for (const operation of operations) {
        const newRefs = operation.refs.map(ref => {
          if (ref.type === 'ecaActivation') {
            return { ...ref, type: 'wcaActivation' }
          } else if (ref.type === 'bcaActivation') {
            return { ...ref, type: 'wcaActivation' }
          } else {
            return ref
          }
        })
        operation.refs = newRefs
        await dbExecute('UPDATE operations SET data = ?, synced = false WHERE uuid = ?', [JSON.stringify(operation), operation.uuid])
      }
      await dbExecute('UPDATE version SET version = 9', [], dbParams)
    }

    // TODO: Uncomment this block when we're close to releasing the December '24 version
    // if (version < 9) {
    //   console.log('createTables -- creating version 8')
    //   await dbExecute(`
    //     ALTER TABLE operations RENAME COLUMN startOnMillisMin TO startAtMillisMin
    //   `, [], { db })
    //   await dbExecute(`
    //     ALTER TABLE operations RENAME COLUMN startOnMillisMax TO startAtMillisMax
    //   `, [], { db })
    //   await dbExecute(`
    //     ALTER TABLE qsos RENAME COLUMN startOnMillis TO startAtMillis
    //   `, [], { db })

    //   await dbExecute('UPDATE version SET version = 8', [], dbParams)
    // }
  }
}
