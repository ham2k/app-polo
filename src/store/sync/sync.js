/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
import { diff } from 'just-diff'

import GLOBAL from '../../GLOBAL'

import { findHooks } from '../../extensions/registry'
import { logRemotely } from '../../distro'
import { markOperationsAsSynced, mergeSyncOperations, queryOperations } from '../operations'
import { markQSOsAsSynced, mergeSyncQSOs, queryQSOs } from '../qsos'
import { selectFiveSecondsTick, startTickTock } from '../time'
import { selectLocalData, setLocalData } from '../local'
import { logTimer } from '../../tools/perfTools'

const SYNC_LOOP_DEBOUNCE_DELAY = 1000 * 0.5 // 500ms, minimum time to wait for more changes before starting a new sync loop
const SYNC_LOOP_DEBOUNCE_MAX = 1000 * 3 // 3 seconds, maximum time to wait for more changes before starting a new sync loop

const DEFAULT_SYNC_LOOP_DELAY = 1000 * 5 // 5 seconds, time between sending batches of changes
const DEFAULT_SYNC_CHECK_PERIOD = 10000 // 1000 * 60 * 1 // 1 minutes, time between checking if a new sync loop is needed

const SMALL_BATCH_SIZE = 5 // QSOs or Operations to send on a quick `syncLatest...`
const DEFAULT_LARGE_BATCH_SIZE = 50 // QSOs or Operations to send on a regular sync loop

const OPERATION_BATCH_RATIO = 5 // Operation data is much smaller, so we can send more of them in a batch

const VERBOSE = 4

let errorCount = 0

export async function sendQSOsToSyncService ({ dispatch }) {
  _scheduleDebouncedFunctionForSyncLoop(async () => {
    await sendOneBatchOfUpdatesToSyncService({ dispatch, batchSize: SMALL_BATCH_SIZE })
  })
}

export async function sendOperationsToSyncService ({ dispatch }) {
  _scheduleDebouncedFunctionForSyncLoop(async () => {
    await sendOneBatchOfUpdatesToSyncService({ dispatch, batchSize: SMALL_BATCH_SIZE })
  })
}

async function sendOneBatchOfUpdatesToSyncService ({ qsos, operations, dispatch, batchSize = 0 }) {
  if (VERBOSE > 0) console.log('sendOneBatchOfUpdatesToSyncService')
  _takeOverSyncLoop()
  logRemotely({ message: 'sendOneBatchOfUpdatesToSyncService', global: GLOBAL.syncEnabled, qsos: qsos?.length, operations: operations?.length, batchSize })
  if (!GLOBAL.syncEnabled) return

  if (!batchSize) {
    batchSize = GLOBAL.syncBatchSize || DEFAULT_LARGE_BATCH_SIZE
  }

  let scheduleAnotherLoop = true
  let sentAllUpdates = false
  let receivedAllUpdates = false

  try {
    const localData = dispatch((_dispatch, getState) => selectLocalData(getState()))

    const syncHook = findHooks('sync')[0] // only one sync source
    logRemotely({ message: 'sendOneBatchOfUpdatesToSyncService - hook', hook: syncHook?.key, batchSize })
    if (!syncHook) return

    if (VERBOSE > 1) console.log(' -- syncing', { hook: syncHook.key, batchSize })

    let syncParams = {}

    // If no qsos are specified, look for a batch of unsynced qsos
    qsos = qsos || await queryQSOs('WHERE synced IS false AND operation != "historical" ORDER BY startOnMillis DESC LIMIT ?', [batchSize])
    if (qsos.length > 0) {
      const opIds = qsos.map(q => `"${q.operation}"`).join(',')
      // Ensure the operations referenced by the `qsos` are also included in the batch
      operations = (operations || []).concat(await queryOperations(`WHERE uuid IN (${opIds}) AND synced IS false LIMIT ?`, [batchSize * OPERATION_BATCH_RATIO]))
      syncParams = { qsos, operations }
    } else {
      // If not qsos are selected then look for a batch of unsynced operations
      operations = operations || await queryOperations('WHERE synced IS false LIMIT ?', [batchSize])
      syncParams = { operations }
    }

    // Remove local data from the syncParams
    if (syncParams.operations) syncParams.operations = syncParams.operations.map(op => { op = { ...op }; delete op.local; return op })

    // operations.forEach(op => {
    //   delete op.startAtMillisMin
    //   delete op.startAtMillisMax
    //   delete op.qsoCount
    // })

    if (GLOBAL.settingsSynced === false) {
      syncParams.settings = dispatch((_dispatch, getState) => getState().settings)
      if (VERBOSE > 1) console.log(' -- syncing settings')
    }

    logRemotely({ message: 'syncing', qsos: qsos.length, operations: operations.length })
    if (Object.keys(syncParams).length > 0) {
      syncParams.meta = syncParams.meta || {}
      syncParams.meta.consent = {
        app: GLOBAL.consentAppData,
        public: GLOBAL.consentOpData
      }
      syncParams.meta.sync = {
        operations: {
          sinceMillis: (localData?.sync?.lastOperationSyncedAtMillis || 0) + 1000,
          limit: batchSize * OPERATION_BATCH_RATIO,
          anyClient: !localData?.sync?.completedFullSync
        },
        qsos: {
          sinceMillis: (localData?.sync?.lastQSOSyncedAtMillis || 0) + 1000,
          limit: batchSize,
          anyClient: !localData?.sync?.completedFullSync
        }
      }

      if (VERBOSE > 2) console.log(' -- calling hook', { meta: syncParams.meta, sync: syncParams.meta?.sync, operations: syncParams.operations?.length, qsos: syncParams.qsos?.length, settings: Object.keys(syncParams?.settings || {}).length })
      if (VERBOSE > 1) logTimer('sync', 'sync', { reset: true })
      const response = await dispatch(syncHook.sync(syncParams))
      if (VERBOSE > 2) console.log(' -- response', { ok: response.ok, operations: response.json.operations.length, qsos: response.json.qsos.length, meta: response.json.meta })
      if (response.ok) {
        if (VERBOSE > 1) logTimer('sync', 'Response parsed')
        if (VERBOSE > 1) console.log(' -- synced ok')
        if (syncParams.qsos) markQSOsAsSynced(qsos)
        if (syncParams.operations) markOperationsAsSynced(operations)
        if (syncParams.settings) GLOBAL.settingsSynced = true
        GLOBAL.lastSyncLoop = Date.now()

        const syncTimes = {}
        if (response.json.operations?.length > 0) {
          if (VERBOSE > 1) console.log(' -- new operations', response.json.operations.length)
          syncTimes.lastOperationSyncedAtMillis = await dispatch(mergeSyncOperations({ operations: response.json.operations }))
          if (VERBOSE > 1) logTimer('sync', 'Done merging operations')
        }

        if (response.json.qsos?.length > 0) {
          if (VERBOSE > 1) console.log(' -- new qsos', response.json.qsos.length)
          syncTimes.lastQSOSyncedAtMillis = await dispatch(mergeSyncQSOs({ qsos: response.json.qsos }))
          if (VERBOSE > 1) logTimer('sync', 'Done merging qsos')
        }

        sentAllUpdates = (qsos.length < batchSize && operations.length < batchSize * OPERATION_BATCH_RATIO)
        receivedAllUpdates = ((response.json.operations?.length || 0) < batchSize * OPERATION_BATCH_RATIO) && ((response.json.qsos?.length || 0) < batchSize)

        if (sentAllUpdates && receivedAllUpdates) {
          if (VERBOSE > 1) console.log(' -- no more changes to sync!!! loop complete')
          scheduleAnotherLoop = false
          GLOBAL.lastFullSync = Date.now()
          syncTimes.completedFullSync = true
        }

        if (Object.keys(syncTimes).length > 0) {
          dispatch(setLocalData({ sync: { ...localData.sync, ...syncTimes } }))
        }
      } else {
        if (VERBOSE > 1) console.log(' -- sync failed', response)
      }
    } else {
      if (VERBOSE > 1) console.log(' -- no changes to sync')
    }

    _releaseSyncLoop()

    if (scheduleAnotherLoop || lastDebouncedSync > 0) {
      if (VERBOSE > 1) console.log(' -- scheduling another loop')
      _scheduleNextSyncLoop({ dispatch })
    }

    errorCount = 0
  } catch (error) {
    logRemotely({ error: 'Error syncing', message: error.message })
    console.error('Error syncing', error)

    _releaseSyncLoop()

    errorCount += 1
    if (errorCount < 8) {
      const delay = (GLOBAL.syncLoopDelay || DEFAULT_SYNC_LOOP_DELAY) + (2 ** errorCount) * 1000
      if (VERBOSE > 1) console.log(' -- retrying in ', delay)
      logRemotely({ message: 'retrying in', delay })
      _scheduleNextSyncLoop({ dispatch, delay })
    }
  }
}

let nextSyncLoopInterval = 0
let lastDebouncedSync = 0

function _takeOverSyncLoop () {
  // No new loops will be scheduled as long as `nextSyncLoopInterval` is true
  if (nextSyncLoopInterval && nextSyncLoopInterval !== true) {
    clearTimeout(nextSyncLoopInterval)
  }
  nextSyncLoopInterval = true
  lastDebouncedSync = 0
}

function _releaseSyncLoop () {
  // Allow new loops to be scheduled
  lastDebouncedSync = 0
  if (nextSyncLoopInterval === true) {
    clearTimeout(nextSyncLoopInterval)
    nextSyncLoopInterval = false
  }
}

function _scheduleDebouncedFunctionForSyncLoop (fn) {
  console.log('_scheduleDebouncedFunctionForSyncLoop')
  if (nextSyncLoopInterval !== true) {
    console.log(' -- debouncing')
    clearTimeout(nextSyncLoopInterval)
    if (lastDebouncedSync && Date.now() - lastDebouncedSync > SYNC_LOOP_DEBOUNCE_MAX) {
      console.log(' -- running immediate')
      lastDebouncedSync = 0
      _takeOverSyncLoop()
      setImmediate(async () => {
        await fn()
        _releaseSyncLoop()
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

function _scheduleNextSyncLoop ({ dispatch, delay = 0 }, loop) {
  if (!delay) {
    delay = GLOBAL.syncLoopDelay || DEFAULT_SYNC_LOOP_DELAY
  }

  if (!nextSyncLoopInterval || nextSyncLoopInterval === true) {
    if (VERBOSE > 1) console.log(' -- scheduling next loop', delay)
    logRemotely({ message: 'scheduling next loop', delay })
    nextSyncLoopInterval = setTimeout(() => sendOneBatchOfUpdatesToSyncService({ dispatch }), delay)
  }
}

export function useSyncLoop ({ dispatch, settings }) {
  const [lastSettings, setLastSettings] = useState()
  useEffect(() => {
    if (settings !== lastSettings) { // Have to check because we update `lastSettings` in this effect
      if (VERBOSE > 2) console.log('Settings Changed')
      if (lastSettings === undefined) {
        if (VERBOSE > 2) console.log('--- first settings')
      } else {
        if (VERBOSE > 2) console.log('-- diffs', diff(lastSettings, settings))
      }
      setLastSettings(settings)
      GLOBAL.settingsSynced = false
    }
  }, [settings, lastSettings])

  const tick = useSelector(selectFiveSecondsTick)
  useEffect(() => {
    setImmediate(() => {
      dispatch(startTickTock())
      console.log('sync tick', tick, GLOBAL.lastSyncLoop)
      if (GLOBAL.syncEnabled) {
        const maxTime = GLOBAL.syncCheckPeriod || DEFAULT_SYNC_CHECK_PERIOD

        if (VERBOSE > 1) console.log('-- sync enabled', { lastSyncLoop: GLOBAL.lastSyncLoop, delta: (tick - (GLOBAL.lastSyncLoop || 0)) })
        if (tick && (tick - (GLOBAL.lastSyncLoop || 0)) > maxTime) {
          if (VERBOSE > 1) console.log('-- sync due')
          _scheduleNextSyncLoop({ dispatch, delay: 1 })
        }
      }
    })
  }, [dispatch, tick])
}

// export function useSyncOperations ({ dispatch, settings }) {
//   if (GLOBAL.syncEnabled) {
//     const localData = dispatch((_dispatch, getState) => selectLocalData(getState()))
//     const { lastRootSync } = localData
//   }
// }
