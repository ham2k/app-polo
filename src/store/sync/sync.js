/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { diff } from 'just-diff'

import GLOBAL from '../../GLOBAL'

import { findHooks } from '../../extensions/registry'
import { addNotice } from '../system'
import { logRemotely } from '../../distro'
import { markOperationsAsSynced, mergeSyncOperations, queryOperations, resetSyncedStatus } from '../operations'
import { markQSOsAsSynced, mergeSyncQSOs, queryQSOs } from '../qsos'
import { selectFiveSecondsTick, startTickTock } from '../time'
import { selectLocalData, selectLocalExtensionData, setLocalData, setLocalExtensionData } from '../local'
import { logTimer } from '../../tools/perfTools'
import { selectFeatureFlag } from '../system'

const SYNC_LOOP_DEBOUNCE_DELAY = 1000 * 0.5 // 500ms, minimum time to wait for more changes before starting a new sync loop
const SYNC_LOOP_DEBOUNCE_MAX = 1000 * 3 // 3 seconds, maximum time to wait for more changes before starting a new sync loop

const DEFAULT_SYNC_LOOP_DELAY = 1000 * 20 // 5 seconds, time between sending batches of changes inside a sync loop
const DEFAULT_SYNC_CHECK_PERIOD = 1000 * 10 // 1000 * 60 * 1 // 1 minutes, time between checking if a new sync loop is needed

const SMALL_BATCH_SIZE = 10 // QSOs or Operations to send on a quick `syncLatest...`
const DEFAULT_LARGE_BATCH_SIZE = 100 // QSOs or Operations to send on a regular sync loop

const QSO_BATCH_RATIO = 20 // Rought average of QSOs per Operation

const VERBOSE = 0

let errorCount = 0

export async function sendQSOsToSyncService ({ dispatch }) {
  _scheduleDebouncedFunctionForSyncLoop(async () => {
    await _doOneRoundOfSyncing({ dispatch, oneSmallBatchOnly: true })
  })
}

export async function sendOperationsToSyncService ({ dispatch }) {
  _scheduleDebouncedFunctionForSyncLoop(async () => {
    await _doOneRoundOfSyncing({ dispatch, oneSmallBatchOnly: true })
  })
}

/*
 * A "sync loop" is one or more "paginated" sync operations in quick succession
 * that continue until all QSOs and Operations have been synced.
 *
 * Every 5 seconds, the `useSyncLoop` hook will check to see
 * if it's been more than `SYNC_CHECK_PERIOD` since the last sync loop,
 * and if so, it will start a new one.
 *
 * Inside the sync loop, `_doOneRoundOfSyncing` is called until there are no more changes to sync,
 * with a `SYNC_LOOP_DELAY` before each call.
 *
 * Independently, the QSO and Operation stores, when there are updates,
 * will call `sendQSOsToSyncService` or `sendOperationsToSyncService`
 * to trigger a single round of syncing with a small batch size.
 */

export function useSyncLoop ({ dispatch, settings, online, appState }) {
  const localData = useSelector(selectLocalData)
  const [lastSettings, setLastSettings] = useState()

  const syncHook = useMemo(() => {
    return findHooks('sync')[0]
  }, [])

  const [currentAccountUUID, setCurrentAccountUUID] = useState()
  useEffect(() => {
    if (online && syncHook) {
      setImmediate(async () => {
        const results = await dispatch(syncHook.getAccountData())
        if (results.ok) {
          const json = results.json
          if (json?.current_account?.uuid) {
            setCurrentAccountUUID(json?.current_account?.uuid)
          }
        }
      })
    }
  }, [dispatch, online, syncHook])

  const [goAheadWithSync, setGoAheadWithSync] = useState(false)
  useEffect(() => {
    if (VERBOSE > 1) console.log('goAheadWithSync', { currentAccountUUID, lastSyncAccountUUID: localData?.sync?.lastSyncAccountUUID })
    if (currentAccountUUID && (currentAccountUUID === localData?.sync?.lastSyncAccountUUID || !localData?.sync?.lastSyncAccountUUID)) {
      if (VERBOSE > 1) console.log(' -- go ahead with sync')
      setGoAheadWithSync(true)
    } else if (currentAccountUUID && localData?.sync?.lastSyncAccountUUID !== currentAccountUUID) {
      // Account changed!!! Disable sync until the user updates their settings
      if (VERBOSE > 1) console.log(' -- account changed, sync disabled')
      setGoAheadWithSync(false)
      logRemotely({ message: 'account changed, sync disabled', currentAccountUUID, lastSyncAccountUUID: localData?.sync?.lastSyncAccountUUID })
      _addNoticeForAccountChanged({dispatch, currentAccountUUID, lastSyncAccountUUID: localData?.sync?.lastSyncAccountUUID})
    } else {
      if (VERBOSE > 1) console.log(' -- no account, sync enabled')
      // No account, try to sync anyway
      setGoAheadWithSync(true)
    }
  }, [localData?.sync?.lastSyncAccountUUID, currentAccountUUID])

  useEffect(() => {
    if (appState === 'starting') return

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
  }, [settings, lastSettings, appState])

  // Phase out dev.lofi.ham2k.net
  const lofiData = useSelector(state => selectLocalExtensionData(state, 'ham2k-lofi'))
  useEffect(() => {
    if (lofiData?.server === 'https://dev.lofi.ham2k.net') {
      dispatch(setLocalExtensionData({ key: 'ham2k-lofi', server: 'https://lofi.ham2k.net' }))
      resetSyncedStatus()
    }
  }, [lofiData?.server, dispatch])

  const tick = useSelector(selectFiveSecondsTick)
  useEffect(() => {
    if (appState === 'starting') return
    setImmediate(() => {
      dispatch(startTickTock())
      if (VERBOSE > 2) console.log('sync tick', tick, GLOBAL.lastSyncLoop)
      if (goAheadWithSync && GLOBAL.syncEnabled && online) {
        const maxTime = GLOBAL.syncCheckPeriod || DEFAULT_SYNC_CHECK_PERIOD

        if (VERBOSE > 2) console.log('-- sync enabled', { lastSyncLoop: GLOBAL.lastSyncLoop, delta: (tick - (GLOBAL.lastSyncLoop || 0)) })
        if (tick && (tick - (GLOBAL.lastSyncLoop || 0)) > maxTime) {
          if (VERBOSE > 2) console.log('-- sync due')
          _scheduleNextSyncLoop({ dispatch, delay: 1 })
        }
      }
    })
  }, [appState, dispatch, online, goAheadWithSync, tick])
}

function _scheduleNextSyncLoop ({ dispatch, delay = 0 }, loop) {
  if (!delay) {
    delay = GLOBAL.syncLoopDelay || DEFAULT_SYNC_LOOP_DELAY
  }

  if (!nextSyncLoopInterval || nextSyncLoopInterval === true) {
    if (VERBOSE > 1) console.log(' -- scheduling next loop', delay)
    logRemotely({ message: 'scheduling next loop', delay })
    nextSyncLoopInterval = setTimeout(() => _doOneRoundOfSyncing({ dispatch }), delay)
  }
}

/*
 * `_doOneRoundOfSyncing` is the core of the sync loop.
 * It is responsible for:
 * - Selecting the QSOs and Operations to sync
 * - Calling the sync hook
 * - Processing the response
 * - Scheduling the next sync loop
 * - Handling errors
 */
async function _doOneRoundOfSyncing ({ dispatch, oneSmallBatchOnly = false }) {
  let inboundSync = false
  dispatch((_dispatch, getState) => {
    inboundSync = selectFeatureFlag(getState(), 'inboundSync') || false
  })

  let batchSize
  if (oneSmallBatchOnly) {
    batchSize = SMALL_BATCH_SIZE
  } else {
    batchSize = GLOBAL.syncBatchSize || DEFAULT_LARGE_BATCH_SIZE
  }

  if (VERBOSE > 0) console.log('_doOneRoundOfSyncing')
  _takeOverSyncLoop()
  logRemotely({ message: 'doOneRoundOfSyncing', global: GLOBAL.syncEnabled, batchSize })
  if (!GLOBAL.syncEnabled) return

  let scheduleAnotherLoop = true

  try {
    const localData = dispatch((_dispatch, getState) => selectLocalData(getState()))

    const syncHook = findHooks('sync')[0] // only one sync source
    logRemotely({ message: 'doOneRoundOfSyncing - hook', hook: syncHook?.key, batchSize })
    if (!syncHook) return

    if (VERBOSE > 1) console.log(' -- syncing', { hook: syncHook.key, batchSize })

    let syncPayload

    // Prepare a batch of QSOs to sync
    const qsos = await queryQSOs('WHERE synced IS false AND operation != "historical" ORDER BY startOnMillis DESC LIMIT ?', [batchSize * QSO_BATCH_RATIO])
    if (qsos.length > 0) {
      const opIds = qsos.map(q => `"${q.operation}"`).join(',')
      // Ensure the operations referenced by the `qsos` are also included in the batch
      const operations = await queryOperations(`WHERE uuid IN (${opIds}) AND synced IS false LIMIT ?`, [batchSize])
      syncPayload = { qsos, operations }
    } else {
      // If not qsos are selected then look for a batch of unsynced operations
      const operations = await queryOperations('WHERE synced IS false LIMIT ?', [batchSize])
      syncPayload = { operations }
    }

    // If verbose is enabled, include more detailed information
    if (GLOBAL.syncVerbose || GLOBAL.syncVerboseNextRound) {
      const qsoCount = await queryQSOs('SELECT COUNT(*) as count AND operation != "historical" FROM qsos', [])
      const unsyncedQSOCount = await queryQSOs('SELECT COUNT(*) as count AND operation != "historical" FROM qsos WHERE synced IS false', [])
      const operationCount = await queryOperations('SELECT COUNT(*) as count FROM operations', [])
      const unsyncedOperationCount = await queryOperations('SELECT COUNT(*) as count FROM operations WHERE synced IS false', [])
      syncPayload.meta = {
        qsoCount: qsoCount[0].count,
        unsyncedQSOCount: unsyncedQSOCount[0].count,
        operationCount: operationCount[0].count,
        unsyncedOperationCount: unsyncedOperationCount[0].count
      }
      GLOBAL.syncVerboseNextRound = false
      if (VERBOSE > 1) console.log(' -- verbose meta', { qsoCount: qsoCount[0].count, unsyncedQSOCount: unsyncedQSOCount[0].count, operationCount: operationCount[0].count, unsyncedOperationCount: unsyncedOperationCount[0].count })
    }

    // Remove operation local data from the syncParams
    if (syncPayload.operations) {
      syncPayload.operations = syncPayload.operations.map(op => { op = { ...op }; delete op.local; return op })
    }

    // Decide if we should sync the settings too
    if (GLOBAL.settingsSynced === false) {
      syncPayload.settings = dispatch((_dispatch, getState) => getState().settings)
      if (VERBOSE > 1) console.log(' -- syncing settings')
    }

    logRemotely({ message: 'syncing', qsos: syncPayload.qsos?.length, operations: syncPayload.operations?.length, settings: !!syncPayload.settings, meta: !!syncPayload.meta })
    if (Object.keys(syncPayload).length > 0) {
      syncPayload.meta = syncPayload.meta || {}
      syncPayload.meta.lastSyncAccountUUID = localData?.sync?.lastSyncAccountUUID
      syncPayload.meta.consent = {
        app: GLOBAL.consentAppData,
        public: GLOBAL.consentOpData
      }

      if (inboundSync) {
        syncPayload.meta.inboundSync = inboundSync

        let syncDirection

        if (localData?.sync?.completedFullSync) {
          syncDirection = 'backfill'
          const now = Date.now()
          syncPayload.meta.sync = {
            operations: {
              untilMillis: (localData?.sync?.earliestOperationSyncedAtMillis || now) - 1,
              limit: batchSize,
              anyClient: true
            },
            qsos: {
              untilMillis: (localData?.sync?.earliestQSOSyncedAtMillis || now) - 1,
              limit: batchSize * 5, // Don't multiply by QSO_BATCH_RATIO because we want a quick response
              anyClient: true
            }
          }
        } else {
          syncDirection = 'forward'
          syncPayload.meta.sync = {
            operations: {
              sinceMillis: (localData?.sync?.lastestOperationSyncedAtMillis || 0) + 1,
              limit: batchSize,
              anyClient: false
            },
            qsos: {
              sinceMillis: (localData?.sync?.lastestQSOSyncedAtMillis || 0) + 1,
              limit: batchSize * QSO_BATCH_RATIO,
              anyClient: false
            }
          }
        }
        if (VERBOSE > 1) console.log(' -- sync direction', syncDirection, syncPayload.meta.sync, localData?.sync)
      }

      // Call the server's `sync` endpoint
      if (VERBOSE > 2) console.log(' -- calling hook', { meta: syncPayload.meta, sync: syncPayload.meta?.sync, operations: syncPayload.operations?.length, qsos: syncPayload.qsos?.length, settings: Object.keys(syncPayload?.settings || {}).length })
      if (VERBOSE > 1) logTimer('sync', 'sync', { reset: true })
      const response = await dispatch(syncHook.sync(syncPayload))
      if (VERBOSE > 1) console.log(' -- response', { ok: response.ok, operations: response?.json?.operations?.length, qsos: response?.json?.qsos?.length, meta: response?.json?.meta, account: response?.json?.account })

      if (await _processResponseMeta({ response, dispatch, localData })) {
        if (response.ok) {
          if (VERBOSE > 1) logTimer('sync', 'Response parsed')
          if (VERBOSE > 1) console.log(' -- synced ok')

          // Mark the QSOs and Operations as synced
          if (syncPayload.qsos) markQSOsAsSynced(syncPayload.qsos)
          if (syncPayload.operations) markOperationsAsSynced(syncPayload.operations)
          if (syncPayload.settings) GLOBAL.settingsSynced = true
          GLOBAL.lastSyncLoop = Date.now()

          // Merge QSOs and operations sent from the server
          const syncTimes = {}
          if (inboundSync && response.json.operations?.length > 0) {
            const { latestSyncedAtMillis, earliestSyncedAtMillis }  = await dispatch(mergeSyncOperations({ operations: response.json.operations }))
            if (VERBOSE > 1) console.log(' -- new operations', response.json.operations.length, { latestSyncedAtMillis, earliestSyncedAtMillis })
            syncTimes.lastestOperationSyncedAtMillis = Math.max(latestSyncedAtMillis, localData?.sync?.lastestOperationSyncedAtMillis)

            if (localData?.sync?.earliestOperationSyncedAtMillis) {
              syncTimes.earliestOperationSyncedAtMillis = Math.min(earliestSyncedAtMillis, localData?.sync?.earliestOperationSyncedAtMillis)
            } else {
              syncTimes.earliestOperationSyncedAtMillis = earliestSyncedAtMillis
            }
            if (VERBOSE > 1) logTimer('sync', 'Done merging operations')
          }

          if (inboundSync && response.json.qsos?.length > 0) {
            const { latestSyncedAtMillis, earliestSyncedAtMillis } = await dispatch(mergeSyncQSOs({ qsos: response.json.qsos }))
            if (VERBOSE > 1) console.log(' -- new qsos', response.json.qsos.length, { latestSyncedAtMillis, earliestSyncedAtMillis })
            syncTimes.lastestQSOSyncedAtMillis = Math.max(latestSyncedAtMillis, localData?.sync?.lastestQSOSyncedAtMillis)
            if (localData?.sync?.earliestQSOSyncedAtMillis) {
              syncTimes.earliestQSOSyncedAtMillis = Math.min(earliestSyncedAtMillis, localData?.sync?.earliestQSOSyncedAtMillis)
            } else {
              syncTimes.earliestQSOSyncedAtMillis = earliestSyncedAtMillis
            }
            if (VERBOSE > 1) logTimer('sync', 'Done merging qsos')
          }

          if (oneSmallBatchOnly) {
            // When doing a small batch, we don't want to schedule more loops
            scheduleAnotherLoop = false
          } else {
            // When doing a regular batch, we want to check
            // if there are any pending QSOs or Operations to keep syncing
            const anyPendingQSO = await queryQSOs('WHERE synced IS false AND operation != "historical" ORDER BY startOnMillis DESC LIMIT 1')
            const anyPendingOperation = await queryOperations('WHERE synced IS false LIMIT 1')
            if (anyPendingQSO.length === 0 && anyPendingOperation.length === 0 && receivedAllUpdates) {
              if (VERBOSE > 1) console.log(' -- no more changes to sync!!! loop complete')
              scheduleAnotherLoop = false
            }

            const receivedAllUpdates = ((response.json.operations?.length || 0) < syncPayload.meta.sync.operations.limit) && ((response.json.qsos?.length || 0) < syncPayload.meta.sync.qsos.limit)
            if (receivedAllUpdates) {
              GLOBAL.lastFullSync = Date.now()
              syncTimes.completedFullSync = true
            }
            if (VERBOSE > 1) console.log(' -- syncTimes', syncTimes)
          }

          // And finally update the last sync times and account id
          if (Object.keys(syncTimes).length > 0) {
            dispatch(setLocalData({ sync: { ...localData.sync, ...syncTimes, lastSyncAccountUUID: response.json.account?.uuid } }))
          }
        } else {
          if (VERBOSE > 1) console.log(' -- sync failed', response)
        }
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
    console.log('Error syncing', error)

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

async function _processResponseMeta ({ response = {}, localData = {}, dispatch }) {
  const { json = {}, ok } = response
  const { meta = {}, account = {} } = json

  if (ok && localData?.sync?.lastSyncAccountUUID && localData.sync.lastSyncAccountUUID !== json.account?.uuid) {
    // Do not process the response unless the account matches the previous sync
    // Let the user know so they can address this in the settings.
    currentAccountUUID = account?.uuid
    if (VERBOSE > 1) console.log(' -- account changed, sync ignored', { lastSyncAccountUUID: localData.sync.lastSyncAccountUUID, newAccountUUID: json.account?.uuid })
      logRemotely({ message: 'account changed, sync ignored', currentAccountUUID, lastSyncAccountUUID: localData.sync?.lastSyncAccountUUID })
    _addNoticeForAccountChanged({dispatch, currentAccountUUID, lastSyncAccountUUID: localData.sync?.lastSyncAccountUUID})
    return false
  }

  try {
    if (meta.resetSyncedStatus || meta.reset_synced_status) {
      await resetSyncedStatus()
    }

    if (meta.syncVerbose || meta.sync_verbose) {
      GLOBAL.syncVerbose = true
    }

    if (meta.syncVerboseNextRound || meta.sync_verbose_next_round) {
      GLOBAL.syncVerboseNextRound = true
    }

    if (meta.suggestedSyncBatchSize || meta.suggested_sync_batch_size) {
      GLOBAL.syncBatchSize = Number.parseInt(meta.suggestedSyncBatchSize ?? meta.suggested_sync_batch_size, 10)
      if (GLOBAL.syncBatchSize < 1) GLOBAL.syncBatchSize = undefined
      if (isNaN(GLOBAL.syncBatchSize)) GLOBAL.syncBatchSize = undefined
    }

    if (meta.suggestedSyncLoopDelay || meta.suggested_sync_loop_delay) {
      GLOBAL.syncLoopDelay = Number.parseInt(meta.suggestedSyncLoopDelay ?? meta.suggested_sync_loop_delay, 10) * 1000
      if (GLOBAL.syncLoopDelay < 1) GLOBAL.syncLoopDelay = undefined
      if (isNaN(GLOBAL.syncLoopDelay)) GLOBAL.syncLoopDelay = undefined
    }

    if (meta.suggestedSyncCheckPeriod || meta.suggested_sync_check_period) {
      GLOBAL.syncCheckPeriod = Number.parseInt(meta.suggestedSyncCheckPeriod ?? meta.suggested_sync_check_period, 10) * 1000
      if (GLOBAL.syncCheckPeriod < 1) GLOBAL.syncCheckPeriod = undefined
      if (isNaN(GLOBAL.syncCheckPeriod)) GLOBAL.syncCheckPeriod = undefined
    }
  } catch (e) {
    console.log('Error parsing sync meta', e, json)
  }
  return true
}

let _lastAccountNotified = 0

function _addNoticeForAccountChanged({dispatch, currentAccountUUID, lastSyncAccountUUID}) {
  if (_lastAccountNotified === currentAccountUUID) return
  _lastAccountNotified = currentAccountUUID
  return dispatch(addNotice({
    unique: 'sync:account-changed',
    priority: -100,
    transient: true,
    title: 'Sync Paused!',
    icon: 'cloud-alert',
    text: 'Sync is paused because the account has changed. Please update your settings to continue syncing.',
    actions: [
      {
        action: 'navigate',
        label: 'Open Settings',
        args: [ 'Settings', { screen: 'SyncSettings' } ]
      }
    ]
  }))
}
