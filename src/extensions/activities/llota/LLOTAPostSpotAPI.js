/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Phillip Kessels <dl9pk@darc.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'
import Config from 'react-native-config'

import packageJson from '../../../../package.json'
import GLOBAL from '../../../GLOBAL'
import { reportError } from '../../../distro'

export const LLOTAPostSpotAPI = async ({ t, calls, comments, freq, mode, refs, spotterCall }) => {
  if (GLOBAL?.flags?.services?.llota === false) return false

  if (refs.length > 0 && refs[0]?.ref) {
    const ref = refs[0]
    const refComment = refs.length > 1 ? `${refs.length}-fer: ${refs.map((x) => (x.ref)).join(' ')}` : ''

    for (const call of calls) {
      try {
        const response = await fetch('https://llota.app/api/public/spots/spot', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': `Ham2K Portable Logger/${packageJson.version}`,
            'X-API-Key': Config.LLOTA_API_KEY
          },
          body: JSON.stringify({
            callsign: call,
            operator_callsign: spotterCall,
            frequency: freq,
            reference: ref.ref,
            mode: mode ?? 'SSB',
            source: 'Ham2K Portable Logger',
            comments: [comments, refComment].filter((x) => (x)).join(' ')
          })
        })
        if (response.status > 299) {
          const body = await response.text()
          Alert.alert(t('extensions.activities.llota.postSpotAPI.error', 'Error posting LLOTA spot'),
            t('extensions.activities.llota.postSpotAPI.serverResponse', 'Server responded with error {{status}}: {{body}}', { status: response.status, body: body }))
          return false
        }
      } catch (error) {
        Alert.alert(t('extensions.activities.llota.postSpotAPI.error', 'Error posting LLOTA spot'), error.message)
        if (error.message !== 'Network request failed') {
          reportError('LLOTA Spotter error', error)
        }
        return false
      }
    }
    return true
  }
}
