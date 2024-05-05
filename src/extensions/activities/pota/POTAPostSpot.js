/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { reportError } from '../../../distro'


import packageJson from '../../../../package.json'
import { filterRefs } from '../../../tools/refTools'

export const POTAPostSpot = (operation, comments) => async (dispatch, getState) => {
  const state = getState()
  const call = operation.stationCall || state.settings.operatorCall

  const refs = filterRefs(operation, 'potaActivation')
  const refComment = refs.length > 1 ? `${refs.length}-fer: ${refs.map((x) => (x.ref)).join(' ')}` : ''
  for (const ref of refs) {
    try {
      const response = await fetch('https://api.pota.app/spot', {
        method: 'POST',
        headers: { 'User-Agent': `Ham2K Portable Logger/${packageJson.version}` },
        body: JSON.stringify({
          activator: call,
          spotter: call,
          frequency: operation.freq,
          reference: ref.ref,
          mode: operation.mode,
          source: 'Ham2K Portable Logger',
          comments: [comments, refComment].filter((x) => (x)).join(' ')
        })
      })
      if (response.status === 200) {
        // const body = await response.text()
        // console.log(body)
      } else {
        const body = await response.text()
        reportError('POTA Spotter http error', response, body)
      }
    } catch (error) {
      reportError('POTA Spotter error', error)
    }
  }
}
