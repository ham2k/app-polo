/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import packageJson from '../../../../package.json'
import { filterRefs } from '../../../tools/refTools'

const validModes = ['CW', 'FM', 'SSB', 'RTTY', 'PSK']

export const GMAPostSpot = (operation, comments) => async (dispatch, getState) => {
  const state = getState()
  const call = operation.stationCall || state.settings.operatorCall

  const refs = filterRefs(operation, 'gmaActivation')
  for (const ref of refs) { // Should only be one
    try {
      const response = await fetch('https://www.cqgma.org/spotsmart2.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
        },
        body: new URLSearchParams({
          yspotter: call,
          ycall: call,
          yreference: ref.ref,
          yqrg: operation.freq,
          ymode: validModes.includes(operation.mode) ? operation.mode : 'other',
          ycomment: comments,
          B1: 'Submit'
        }).toString()
      })
      if (response.status === 200) {
        // const body = await response.text()
        // console.log(body)
      } else {
        const body = await response.text()
        console.error('Error in GMA Spot', { response, body })
      }
    } catch (error) {
      console.error('Error in GMA Spot', error)
    }
  }
}
