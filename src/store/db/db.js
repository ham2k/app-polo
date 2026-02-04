/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { open as sqliteOpen } from '@op-engineering/op-sqlite'
import RNFetchBlob from 'react-native-blob-util'
import RNRestart from 'react-native-restart'

import { createTables } from './dbSchema'
import { logRemotely } from '../../distro'
import { fmtTimestamp } from '../../tools/timeFormats'
import { Platform } from 'react-native'

const DB_NAME = 'polo.sqlite'
const DB_DISPLAY_NAME = 'Ham2K Portable Logger Database'
const DB_ESTIMATED_SIZE = 1000

let GLOBAL_DB = null

const transactionWrapper = (params = {}) => (wrappedFunction) => {
  const { txn, db } = params

  if (db) {
    if (txn) {
      return new Promise((resolve, reject) => {
        wrappedFunction({ txn, db, resolve, reject })
      })
    } else {
      return new Promise((resolve, reject) => {
        db.transaction(t => wrappedFunction({ txn: t, db, resolve, reject }))
      })
    }
  } else {
    return database().then(newDb => {
      return new Promise((resolve, reject) => {
        newDb.transaction(t => wrappedFunction({ txn: t, db: newDb, resolve, reject }))
      })
    })
  }
}

export async function dbTransaction(code, options = {}) {
  await transactionWrapper(options)(async transaction => {
    try {
      const result = await code(transaction)
      transaction.resolve(result)
    } catch (error) {
      transaction.reject(error)
    }
  })
}

export function dbExecute(sql, params, options = {}) {
  if (sql.indexOf('"') >= 0) console.error('SQL has double quotes', { sql, params })

  return transactionWrapper(options.transaction)(({ txn, resolve, reject }) => {
    txn.execute(sql, params ?? []).then(results => {
      resolve(results)
    }).catch(error => {
      console.error(`Error in dbExecute: ${error.message}`, sql, params, error)
      if (options.ignoreError && error.message.indexOf(options.ignoreError) >= 0) {
        resolve(false)
      } else {
        reject(error)
      }
    })
  })
}

export function dbExecuteFast(sql, params, options = {}) {
  return transactionWrapper(options.transaction)(({ txn, db, resolve, reject }) => {
    db.executeWithHostObjects(sql, params ?? []).then(results => {
      resolve(results)
    }).catch(error => {
      console.error(`Error in dbExecuteFast: ${error.message}`, sql, params, error)
      if (options.ignoreError && error.message.indexOf(options.ignoreError) >= 0) {
        resolve(false)
      } else {
        reject(error)
      }
    })
  })
}

export function dbExecuteBatch(statements, options = {}) {
  if (statements.length === 0 || !statements) return false

  return transactionWrapper(options.transaction)(({ txn, db, resolve, reject }) => {
    db.executeBatch(statements).then(results => {
      resolve(results)
    }).catch(error => {
      console.error(`Error in dbExecuteBatch: ${error.message}`, error)
      if (options.ignoreError && error.message.indexOf(options.ignoreError) >= 0) {
        resolve(false)
      } else {
        reject(error)
      }
    })
  })
}

export async function dbSelectAll(sql, params, { transaction, row } = {}) {
  const results = await dbExecute(sql, params, { transaction })

  if (row) {
    return results.rows.map(row)
  } else {
    return [...results.rows]
  }
}

export async function dbSelectOne(sql, params, { db, transaction, row } = {}) {
  const results = await dbExecute(sql, params, { transaction })

  if (row) {
    return row(results.rows[0])
  } else {
    return results.rows[0]
  }
}

export function database() {
  return new Promise(async (resolve, reject) => {
    if (GLOBAL_DB) {
      resolve(GLOBAL_DB)
    } else {
      await backupOldDatabase()

      GLOBAL_DB = sqliteOpen({
        name: DB_NAME,
        location: directoryForDatabase(),
      })

      createTables({ db: GLOBAL_DB }).then(() => {
        resolve(GLOBAL_DB)
      }).catch(e => {
        // reportError('Error opening database', e)
        reject(e)
      })
    }
  })
}

export function directoryForDatabase() {
  if (Platform.OS === 'ios') return `${RNFetchBlob.fs.dirs.DocumentDir}/../Library/NoCloud`
  else if (Platform.OS === 'android') return `${RNFetchBlob.fs.dirs.DocumentDir}`
  else return null
}

export function pathForDatabase(name = DB_NAME) {
  const directory = directoryForDatabase()
  if (directory) return `${directoryForDatabase()}/${name}`
  else return null
}

async function backupOldDatabase() {
  const path = pathForDatabase(DB_NAME)

  if (! await RNFetchBlob.fs.exists(path + ".old")) {
    if (await RNFetchBlob.fs.exists(path)) {
      await RNFetchBlob.fs.cp(path, path + ".old")
    } else {
      await RNFetchBlob.fs.writeFile(path + ".old", "")
    }
  }
}

export async function backupDatabase(tag) {
  const path = pathForDatabase(DB_NAME)

  tag = tag || fmtTimestamp(Date.now())
  const backupName = DB_NAME.replace('.sqlite', `.${tag}.sqlite`)
  const backupPath = pathForDatabase(backupName)

  await RNFetchBlob.fs.cp(path, backupPath)
}

export async function replaceDatabase(newPath) {
  const path = pathForDatabase(DB_NAME)

  const backupName = DB_NAME.replace('.sqlite', `.${fmtTimestamp(Date.now())}.sqlite`)
  const backupPath = pathForDatabase(backupName)

  await RNFetchBlob.fs.mv(path, backupPath)
  await RNFetchBlob.fs.cp(newPath, path)
  closeDatabaseAndRestart()
}

export async function resetDatabase() {
  const path = pathForDatabase(DB_NAME)

  const backupName = DB_NAME.replace('.sqlite', `.${fmtTimestamp(Date.now())}.sqlite`)
  const backupPath = pathForDatabase(backupName)

  await RNFetchBlob.fs.mv(path, backupPath)
  closeDatabaseAndRestart()
}

export async function closeDatabaseAndRestart() {
  await GLOBAL_DB.close()
  GLOBAL_DB = null
  RNRestart.restart()
}
