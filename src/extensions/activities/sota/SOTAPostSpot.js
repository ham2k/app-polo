/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2024 Steven Hiscocks <steven@hiscocks.me.uk>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { ADIF_SUBMODES } from '@ham2k/lib-operation-data'

import { filterRefs } from '../../../tools/refTools'
import { apiSOTA } from './apiSOTA'

const validModes = ['AM', 'CW', 'Data', 'DV', 'FM', 'SSB']

export const SOTAPostSpot = (operation, comments) => async (dispatch, getState) => {
  const state = getState()
  const activatorCallsign = operation.stationCall || state.settings.operatorCall

  const refs = filterRefs(operation, 'sotaActivation')
  for (const ref of refs) { // Should only be one
    const [associationCode, summitCode] = ref.ref.split('/', 2)

    let mode = operation.mode
    if (!validModes.includes(mode)) {
      if (ADIF_SUBMODES.SSB.includes(mode)) {
        mode = 'SSB'
      } else if (mode === 'DIGITALVOICE' || ADIF_SUBMODES.DIGITALVOICE.includes(mode)) {
        mode = 'DV'
      } else {
        mode = 'Data' // Reasonable guess
      }
    }
    const spot = {
      associationCode,
      summitCode,
      activatorCallsign,
      frequency: `${operation.freq / 1000}`, // string
      mode,
      comments
    }
    // Errors will be logged by apiSOTA
    const promise = dispatch(apiSOTA.endpoints.spot.initiate(spot))
    promise.unsubscribe()
  }
}
