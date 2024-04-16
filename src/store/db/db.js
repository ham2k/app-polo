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

export function dbExecute (sql, params, options = {}) {
  const { db } = options
  if (db) {
    return new Promise((resolve, reject) => {
      db.transaction(localTxn => {
        localTxn.executeSql(sql, params ?? [],
          (tx, results) => {
            resolve(results)
          },
          (tx, error) => {
            console.info('Error executing SQL', { sql, params, error })
            reject(error)
          }
        )
      })
    })
  } else {
    return database().then(localDb => {
      return new Promise((resolve, reject) => {
        localDb.transaction(localTxn => {
          localTxn.executeSql(sql, params ?? [],
            (tx, results) => {
              resolve(results)
            },
            (tx, error) => {
              console.info('Error executing SQL', { sql, params, error })
              reject(error)
            }
          )
        })
      })
    })
  }
}

export function dbSelectAll (sql, params, { db, row } = {}) {
  return dbExecute(sql, params, { db }).then((results) => {
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
  })
}

export function dbSelectOne (sql, params, { db, row } = {}) {
  return dbExecute(sql, params, { db }).then((results) => {
    if (row) {
      return row(results.rows.item(0))
    } else {
      return results.rows.item(0)
    }
  })
}

export function database () {
  return new Promise((resolve, reject) => {
    if (GLOBAL_DB) {
      resolve(GLOBAL_DB)
    } else {
      GLOBAL_DB = SQLite.openDatabase(DB_NAME, '0', DB_DISPLAY_NAME, DB_ESTIMATED_SIZE)

      createTables(GLOBAL_DB).then(() => {
        resolve(GLOBAL_DB)
      }).catch(e => {
        // reportError('Error opening database', e)
        reject(e)
      })
    }
  })
}
