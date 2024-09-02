/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import packageJson from '../../../../package.json'
import { parseCallsign } from '@ham2k/lib-callsigns'

export const GMACommonPostSpot = ({ operation, vfo, comments, refs, url }) => async (dispatch, getState) => {
  const state = getState()
  const call = operation.stationCall || state.settings.operatorCall
  const baseCall = parseCallsign(call).baseCall

  const mainRef = refs[0].ref
  const refComment = refs.length > 1 ? `also ${refs.slice(1).map((x) => (x.ref)).join(' ')}` : ''
  try {
    const response = await fetch(url ?? 'https://www.cqgma.org/spotsmart2.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      },
      body: new URLSearchParams({
        yspotter: baseCall ?? call, // Spotter shouldn't include /P, etc.
        ycall: call,
        yreference: mainRef,
        yqrg: vfo.freq,
        ymode: vfo.mode ?? 'SSB',
        ycomment: [comments, refComment].filter((x) => (x)).join(' '),
        B1: 'Submit'
      }).toString()
    })
    if (response.status === 200) {
      // const body = await response.text()
      // console.log(body)
      return true
    } else {
      const body = await response.text()
      console.error('Error in GMA Spot', { response, body })
      return false
    }
  } catch (error) {
    console.error('Error in GMA Spot', error)
    return false
  }
}
