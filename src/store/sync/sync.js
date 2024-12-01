/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { findHooks } from '../../extensions/registry'
import GLOBAL from '../../GLOBAL'
import { dbExecute } from '../db/db'
import { queryOperations } from '../operations'
import { queryQSOs } from '../qsos'

const SYNC_LOOP_DELAY = 1000 // 30 seconds

const SMALL_BATCH_SIZE = 5
const LARGE_BATCH_SIZE = 50

const DEBUG = false

export async function syncLatestQSOs ({ settings, dispatch }) {
  await syncOneBatchOfQSOs({ settings, dispatch, batchSize: SMALL_BATCH_SIZE })
}

async function syncOneBatchOfQSOs ({ settings, dispatch, batchSize = LARGE_BATCH_SIZE }) {
  if (DEBUG) console.log('syncOneBatchOfQSOs')
  takeOverSyncLoop()

  if (!GLOBAL.syncEnabled) return

  try {
    const syncHook = findHooks('sync')[0] // only one sync source

    if (!syncHook) return
    if (DEBUG) console.log(' -- syncHook', syncHook.key)

    const qsos = await queryQSOs('WHERE synced IS false AND operation != "historical" ORDER BY startOnMillis DESC LIMIT ?', [batchSize])
    const opIds = qsos.map(q => `"${q.operation}"`).join(',')
    const operations = await queryOperations(`WHERE uuid IN (${opIds}) AND synced IS false`, [])
    operations.forEach(op => {
      delete op.startAtMillisMin
      delete op.startAtMillisMax
      delete op.qsoCount
    })

    if (qsos.length > 0) {
      if (DEBUG) console.log(' -- calling hook')
      const ok = await syncHook.sendChanges({ qsos, operations, settings, dispatch })
      if (DEBUG) console.log(' -- result', ok)
      if (ok) {
        if (DEBUG) console.log(' -- marking as synced')
        markQSOsAsSynced(qsos)
        markOperationsAsSynced(operations)
      }
      if (DEBUG) console.log(' -- cleaning')
      if (qsos.length === batchSize) {
        if (DEBUG) console.log(' -- calling next loop')
        scheduleNextSyncLoop({ settings, dispatch })
      }
    }
  } catch (error) {
    console.error('Error syncing QSOs', error)
    scheduleNextSyncLoop({ settings, dispatch })
  }
}

let nextSyncLoopInterval

export function cancelNextSyncLoop () {
  if (nextSyncLoopInterval && nextSyncLoopInterval !== true) {
    clearInterval(nextSyncLoopInterval)
    nextSyncLoopInterval = null
  }
}
function takeOverSyncLoop () {
  if (nextSyncLoopInterval && nextSyncLoopInterval !== true) {
    clearInterval(nextSyncLoopInterval)
    nextSyncLoopInterval = true
  }
}

function scheduleNextSyncLoop ({ settings, dispatch }) {
  if (!nextSyncLoopInterval || nextSyncLoopInterval === true) {
    nextSyncLoopInterval = setInterval(() => syncOneBatchOfQSOs({ settings, dispatch }), SYNC_LOOP_DELAY)
  }
}

export async function markQSOsAsSynced (qsos) {
  if (!qsos || qsos.length === 0) return
  await dbExecute(`UPDATE qsos SET synced = true WHERE uuid IN (${qsos.map(q => `"${q.uuid}"`).join(',')})`, [])
}

export async function markOperationsAsSynced (operations) {
  if (!operations || operations.length === 0) return
  await dbExecute(`UPDATE operations SET synced = true WHERE uuid IN (${operations.map(q => `"${q.uuid}"`).join(',')})`, [])
}

export async function resetSyncedStatus () {
  await dbExecute('UPDATE qsos SET synced = false', [])
  await dbExecute('UPDATE operations SET synced = false', [])
}
