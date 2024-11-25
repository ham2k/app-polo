/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import SQLite from 'react-native-sqlite-2'
import { createTables } from './createTables'

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

export async function dbTransaction (code, options = {}) {
  await transactionWrapper(options)(async transaction => {
    try {
      const result = await code(transaction)
      transaction.resolve(result)
    } catch (error) {
      transaction.reject(error)
    }
  })
}

export function dbExecute (sql, params, options = {}) {
  return transactionWrapper(options.transaction)(({ txn, resolve, reject }) => {
    txn.executeSql(sql, params ?? [],
      (tx, results) => {
        resolve(results)
      },
      (tx, error) => {
        console.info('Error executing SQL', { sql, params, error })
        reject(error)
      }
    )
  })
}

export async function dbSelectAll (sql, params, { transaction, row } = {}) {
  const results = await dbExecute(sql, params, { transaction })
  const rows = []
  if (row) {
    for (let i = 0; i < results.rows.length; i++) {
      rows.push(row(results.rows.item(i)))
    }
  } else {
    for (let i = 0; i < results.rows.length; i++) {
      rows.push(results.rows.item(i))
    }
  }
  return rows
}

export async function dbSelectOne (sql, params, { db, transaction, row } = {}) {
  const results = await dbExecute(sql, params, { transaction })

  if (row) {
    return row(results.rows.item(0))
  } else {
    return results.rows.item(0)
  }
}

export function database () {
  return new Promise((resolve, reject) => {
    if (GLOBAL_DB) {
      resolve(GLOBAL_DB)
    } else {
      GLOBAL_DB = SQLite.openDatabase(DB_NAME, '0', DB_DISPLAY_NAME, DB_ESTIMATED_SIZE)

      createTables({ db: GLOBAL_DB }).then(() => {
        resolve(GLOBAL_DB)
      }).catch(e => {
        // reportError('Error opening database', e)
        reject(e)
      })
    }
  })
}
