/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2025 Phillip Kessels <dl9pk@darc.de>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'
import { useTranslation } from 'react-i18next'

import packageJson from '../../../../package.json'
import GLOBAL from '../../../GLOBAL'
import { reportError } from '../../../distro'

export const POTAPostSpotAPI = async ({ t, calls, comments, freq, mode, refs, spotterCall }) => {
  if (GLOBAL?.flags?.services?.pota === false) return false

  if (refs.length > 0 && refs[0]?.ref) {
    const ref = refs[0]
    const refComment = refs.length > 1 ? `${refs.length}-fer: ${refs.map((x) => (x.ref)).join(' ')}` : ''

    for (const call of calls) {
      try {
        const response = await fetch('https://api.pota.app/spot', {
          method: 'POST',
          headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` },
          body: JSON.stringify({
            activator: call,
            spotter: spotterCall,
            frequency: freq,
            reference: ref.ref,
            mode: mode ?? 'SSB',
            source: 'Ham2K Portable Logger',
            comments: [comments, refComment].filter((x) => (x)).join(' ')
          })
        })
        if (response.status !== 200) {
          const body = await response.text()
          Alert.alert(t('extensions.activities.pota.postSpotAPI.error', 'Error posting POTA spot'),
            t('extensions.activities.pota.postSpotAPI.serverResponse', 'Server responded with error {{status}}: {{body}}', { status: response.status, body: body }))
          // reportError('POTA Spotter http error', response, body)
          return false
        }
      } catch (error) {
        Alert.alert(t('extensions.activities.pota.postSpotAPI.error', 'Error posting POTA spot'), error.message)
        if (error.message !== 'Network request failed') {
          reportError('POTA Spotter error', error)
        }
        return false
      }
    }
    return true
  }
}
