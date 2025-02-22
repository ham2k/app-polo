/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { DevSettings } from 'react-native'

import { persistor } from '../../store'
import { addQSOs } from '../../store/qsos'
import { resetDatabase } from '../../store/db/db'
import { setLocalData } from '../../store/local'
import { setSettings } from '../../store/settings'
import { setSystemFlag } from '../../store/system'
import { poissonRandom } from '../../tools/randomTools'
import { logTimer } from '../../tools/perfTools'
import { annotateQSO } from '../../screens/OperationScreens/OpLoggingTab/components/LoggingPanel/useCallLookup'
import { getAllCallsFromNotes } from '../data/call-notes/CallNotesExtension'

const Info = {
  key: 'commands-debug',
  name: 'Commands that assist in debugging problems'
}

const Extension = {
  ...Info,
  category: 'commands',
  hidden: true,
  alwaysEnabled: true,
  onActivation: ({ registerHook }) => {
    registerHook('command', { priority: 100, hook: ErrorCommandHook })
    registerHook('command', { priority: 100, hook: SeedCommandHook })
    registerHook('command', { priority: 100, hook: OnboardCommandHook })
    registerHook('command', { priority: 100, hook: WipeDBCommandHook })
    registerHook('command', { priority: 100, hook: FactoryResetCommandHook })
  }
}

export default Extension

const ErrorCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-error',
  match: /3RR0R/i,
  describeCommand: (match) => {
    return 'Throw a test error?'
  },
  invokeCommand: (match, { handleFieldChange }) => {
    throw new Error('Test error!')
  }
}

const OnboardCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-onboard',
  match: /ONBOARD/i,
  describeCommand: (match) => {
    return 'Reset the onboarding process?'
  },
  invokeCommand: (match, { dispatch }) => {
    dispatch(setSystemFlag('onboardedOn', undefined))
    dispatch(setSettings({ operatorCall: undefined }))
    setTimeout(() => DevSettings.reload(), 500)
    return 'Onboarding process resetted'
  }
}

const WipeDBCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-wipedb',
  match: /WIPEDB!/i,
  describeCommand: (match) => {
    return 'Delete database (but keep settings)?'
  },
  invokeCommand: (match, { dispatch }) => {
    dispatch(setLocalData({ sync: { lastOperationSyncedAtMillis: 0, completedFullSync: false } }))
    setTimeout(async () => {
      await resetDatabase()
    }, 1000)
    return 'Wiping Database…'
  }
}

const FactoryResetCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-factory',
  match: /FACTORY!/i,
  describeCommand: (match) => {
    return 'Delete all data and settings?'
  },
  invokeCommand: (match, { dispatch, settings }) => {
    setTimeout(async () => {
      await persistor.purge()
      await resetDatabase()
    }, 1000)
    return 'Factoy Reset in progress…'
  }
}

const SeedCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-seed',
  match: /^SEED(\d+)$/i,
  describeCommand: (match) => {
    const count = parseInt(match[1], 10)
    return `Seed the log with ${count} QSOs?`
  },
  invokeCommand: (match, { handleFieldChange, handleSubmit, updateLoggingState, dispatch, qso, vfo, operation, settings, online, ourInfo }) => {
    let count = parseInt(match[1], 10)
    setTimeout(async () => {
      let startAtMillis = Date.now()
      const times = []
      for (let i = 0; i < count; i++) {
        const t = poissonRandom(120) * 1000 // mean of 120 seconds per QSO
        times.push(t)
        startAtMillis -= t
      }
      const calls = getAllCallsFromNotes().filter(x => x)
      if (calls.length === 0) calls.concat(['KI2D', 'M1SDH', 'EI5IYB', 'M0LZN', 'WV3H', 'LB4FH', 'VK1AO'])

      logTimer('seeding', 'Start', { reset: true })
      const qsos = []
      while (count > 0) {
        const index = Math.floor(Math.random() * calls.length)
        let call = calls[index] || 'N0CALL'

        if (Math.random() > 0.20) { // On 80% of the calls, replace the digit with something random
          call = call.replace(/(?<=\w)(\d)/, (m, p1) => {
            return (parseInt(p1, 10) + Math.floor(Math.random() * 10)) % 10
          })
        }

        calls.splice(index, 1)

        let oneQSO = {
          mode: qso?.mode ?? vfo?.mode ?? 'SSB',
          band: qso?.band ?? vfo?.band ?? '20m',
          freq: qso?.freq ?? vfo?.freq,
          startAtMillis,
          startAt: new Date(startAtMillis).toISOString()
        }
        oneQSO.their = { call, sent: randomRST(oneQSO.mode) }
        oneQSO.our = { call: ourInfo.call, operatorCall: ourInfo.operatorCall || operation.local?.operatorCall, sent: randomRST(oneQSO.mode) }
        oneQSO = await annotateQSO({ qso: oneQSO, online, settings, dispatch })

        qsos.push(oneQSO)

        count--
        startAtMillis = startAtMillis + times.pop()
        logTimer('seeding', 'Seeded one', { sinceLast: true })
      }
      await dispatch(addQSOs({ uuid: operation.uuid, qsos }))
      updateLoggingState({ selectedUUID: undefined, lastUUID: qsos[qsos.length - 1]?.uuid })

      logTimer('seeding', 'Done seeding')
    }, 0)
    return `Seeding the log with ${count} QSOs`
  }
}

function randomRST (mode) {
  const n = Math.min(poissonRandom(7), 9)
  if (mode === 'CW' || mode === 'RTTY') {
    return `${Math.min(n, 5)}${n}${n}`
  } else {
    return `${Math.min(n, 5)}${n}`
  }
}
