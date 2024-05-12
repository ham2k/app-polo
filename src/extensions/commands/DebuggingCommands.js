/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { qsoKey } from '@ham2k/lib-qson-tools'

import { addQSO } from '../../store/qsos'
import { annotateQSO } from '../../screens/OperationScreens/OpInfoTab/components/useQSOInfo'
import { getAllCallsFromNotes } from '../data/call-notes/CallNotesExtension'
import { poissonRandom } from '../../tools/randomTools'

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
  }
}

export default Extension

const ErrorCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-error',
  match: /3RR0R/i,
  invokeCommand: (match, { handleFieldChange }) => {
    throw new Error('Test error!')
  }
}

const SeedCommandHook = {
  ...Info,
  extension: Extension,
  key: 'commands-debug-error',
  match: /^SEED(\d+)$/i,
  invokeCommand: (match, { handleFieldChange, handleSubmit, updateLoggingState, dispatch, qso, operation, settings, online, ourInfo }) => {
    setTimeout(async () => {
      let count = parseInt(match[1], 10)
      let startOnMillis = Date.now()
      const times = []
      for (let i = 0; i < count; i++) {
        const t = poissonRandom(120) * 1000 // mean of 120 seconds per QSO
        times.push(t)
        startOnMillis -= t
      }
      const calls = getAllCallsFromNotes().filter(x => x)

      while (count > 0) {
        const index = Math.floor(Math.random() * calls.length)
        let call = calls[index]

        if (Math.random() > 0.20) { // On 80% of the calls, replace the digit with something random
          call = call.replace(/(?<=\w)(\d)/, (m, p1) => {
            return (parseInt(p1, 10) + Math.floor(Math.random() * 10)) % 10
          })
        }

        calls.splice(index, 1)

        const oneQSO = {
          mode: qso.mode ?? operation.mode ?? 'SSB',
          band: qso.band ?? operation.band ?? '20m',
          freq: qso.freq ?? operation.freq,
          startOnMillis,
          startOn: new Date(startOnMillis).toISOString()
        }
        oneQSO.their = { call, sent: randomRST(oneQSO.mode) }
        oneQSO.our = { call: ourInfo.call, sent: randomRST(oneQSO.mode) }
        await annotateQSO({ qso: oneQSO, online, settings, dispatch })

        oneQSO.key = qsoKey(oneQSO)
        await dispatch(addQSO({ uuid: operation.uuid, qso: oneQSO }))
        updateLoggingState({ selectedKey: undefined, lastKey: oneQSO.key })

        count--
        startOnMillis = startOnMillis + times.pop()
      }
    }, 0)
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
