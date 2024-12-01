/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect } from 'react'
import { findHooks } from '../../extensions/registry'
import GLOBAL from '../../GLOBAL'
import { dbExecute } from '../db/db'
import { queryOperations } from '../operations'
import { queryQSOs } from '../qsos'
import { selectOneMinuteTick, startTickTock } from '../time'
import { useSelector } from 'react-redux'

const SYNC_LOOP_DEBOUNCE_DELAY = 1000 * 0.5 // 500ms, minimum time to wait for more changes before starting a new sync loop
const SYNC_LOOP_DEBOUNCE_MAX = 1000 * 3 // 3 seconds, maximum time to wait for more changes before starting a new sync loop

const SYNC_LOOP_DELAY = 1000 * 5 // 5 seconds, time between sending batches of changes
const SYNC_CHECK_PERIOD = 1000 * 60 * 1 // 1 minutes, time between checking if a new sync loop is needed

const SMALL_BATCH_SIZE = 5 // QSOs or Operations to send on a quick `syncLatest...`
const LARGE_BATCH_SIZE = 50 // QSOs or Operations to send on a regular sync loop

const DEBUG = true

export async function syncLatestQSOs ({ getState, dispatch }) {
  scheduleDebouncedFunctionForSyncLoop(async () => {
    await syncOneBatchOfChanges({ getState, dispatch, batchSize: SMALL_BATCH_SIZE })
  })
}

export async function syncLatestOperations ({ getState, dispatch }) {
  scheduleDebouncedFunctionForSyncLoop(async () => {
    await syncOneBatchOfChanges({ getState, dispatch, batchSize: SMALL_BATCH_SIZE })
  })
}

async function syncOneBatchOfChanges ({ qsos, operations, getState, dispatch, batchSize = 0 }) {
  if (DEBUG) console.log('syncOneBatchOfChanges')
  takeOverSyncLoop()

  if (!GLOBAL.syncEnabled) return

  const settings = getState().settings

  if (!batchSize) {
    batchSize = settings.syncBatchSize || LARGE_BATCH_SIZE
  }

  let scheduleAnotherLoop = true

  try {
    const syncHook = findHooks('sync')[0] // only one sync source

    if (!syncHook) return

    if (DEBUG) console.log(' -- syncing', { hook: syncHook.key, batchSize })

    // If no qsos are specified, look for a batch of unsynced qsos
    qsos = qsos || await queryQSOs('WHERE synced IS false AND operation != "historical" ORDER BY startOnMillis DESC LIMIT ?', [batchSize])
    if (qsos.length > 0) {
      const opIds = qsos.map(q => `"${q.operation}"`).join(',')
      // Ensure the operations referenced by the `qsos` are also included in the batch
      operations = (operations || []).concat(await queryOperations(`WHERE uuid IN (${opIds}) AND synced IS false LIMIT ?`, [batchSize]))
    } else {
      // If not qsos are selected then look for a batch of unsynced operations
      operations = operations || await queryOperations('WHERE synced IS false LIMIT ?', [batchSize])
    }

    operations.forEach(op => {
      delete op.startAtMillisMin
      delete op.startAtMillisMax
      delete op.qsoCount
    })

    if (qsos.length > 0 || operations.length > 0) {
      if (DEBUG) console.log(' -- calling hook')
      const ok = await syncHook.sendChanges({ qsos, operations, settings, dispatch })
      if (DEBUG) console.log(' -- result', ok)
      if (ok) {
        if (DEBUG) console.log(' -- marking as synced')
        markQSOsAsSynced(qsos)
        markOperationsAsSynced(operations)
        GLOBAL.lastSyncLoop = Date.now()
      }
    } else {
      console.log(' -- no changes to sync')
    }

    if (qsos.length < batchSize && operations.length < batchSize) {
      scheduleAnotherLoop = false
      GLOBAL.lastFullSync = Date.now()
      releaseSyncLoop()
    }

    if (scheduleAnotherLoop || lastDebouncedSync > 0) {
      if (DEBUG) console.log(' -- scheduling next loop')
      scheduleNextSyncLoop({ getState, dispatch })
    }
  } catch (error) {
    console.error('Error syncing QSOs', error)
    scheduleNextSyncLoop({ getState, dispatch })
  }
}

let nextSyncLoopInterval = 0
let lastDebouncedSync = 0

function takeOverSyncLoop () {
  // No new loops will be scheduled as long as `nextSyncLoopInterval` is true
  if (nextSyncLoopInterval && nextSyncLoopInterval !== true) {
    clearTimeout(nextSyncLoopInterval)
  }
  nextSyncLoopInterval = true
  lastDebouncedSync = 0
}

export function releaseSyncLoop () {
  // Allow new loops to be scheduled
  lastDebouncedSync = 0
  if (nextSyncLoopInterval === true) {
    clearTimeout(nextSyncLoopInterval)
    nextSyncLoopInterval = false
  }
}

export function scheduleDebouncedFunctionForSyncLoop (fn) {
  console.log('scheduleDebouncedFunctionForSyncLoop')
  if (nextSyncLoopInterval !== true) {
    console.log(' -- debouncing')
    clearTimeout(nextSyncLoopInterval)
    if (lastDebouncedSync && Date.now() - lastDebouncedSync > SYNC_LOOP_DEBOUNCE_MAX) {
      console.log(' -- running immediate')
      lastDebouncedSync = 0
      takeOverSyncLoop()
      setImmediate(async () => {
        await fn()
        releaseSyncLoop()
      })
    } else {
      console.log('-- scheduling in ', SYNC_LOOP_DEBOUNCE_DELAY)
      nextSyncLoopInterval = setTimeout(fn, SYNC_LOOP_DEBOUNCE_DELAY)
      lastDebouncedSync = Date.now()
    }
  } else {
    console.log('-- something else is running')
    lastDebouncedSync = Date.now()
  }
}

export function scheduleNextSyncLoop ({ getState, dispatch, delay = 0 }, loop) {
  const settings = getState().settings

  if (!delay) {
    delay = settings.syncLoopDelay || SYNC_LOOP_DELAY
  }

  if (!nextSyncLoopInterval || nextSyncLoopInterval === true) {
    if (DEBUG) console.log(' -- scheduling next loop', delay)
    nextSyncLoopInterval = setTimeout(() => syncOneBatchOfChanges({ getState, dispatch }), delay)
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

export function useSyncLoop ({ dispatch, settings }) {
  const oneMinuteTick = useSelector(selectOneMinuteTick)

  useEffect(() => {
    setImmediate(() => {
      dispatch(startTickTock())

      console.log('sync tick', oneMinuteTick, GLOBAL.lastSyncLoop)
      if (GLOBAL.syncEnabled) {
        const maxTime = settings.syncCheckPeriod || SYNC_CHECK_PERIOD

        console.log('-- sync enabled', (oneMinuteTick - (GLOBAL.lastSyncLoop || 0)))
        if ((oneMinuteTick - (GLOBAL.lastSyncLoop || 0)) > maxTime) {
          console.log('-- sync due')
          dispatch((_dispatch, getState) => scheduleNextSyncLoop({ getState, dispatch: _dispatch }))
        }
      }
    })
  }, [settings?.syncCheckPeriod, dispatch, oneMinuteTick])
}
