/*
 * Copyright ©️ 2024 Aldo Mendoza <NA7DO>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { actions, selectQSOs } from '../qsosSlice'
import { findHooks } from '../../../extensions/registry'

export const confirmFromSpots = (options = {}) => async (dispatch, getState) => {
  if (!options.operation) {
    return
  }

  const hooks = findHooks('confirmation')
  if (!hooks || hooks.length === 0) {
    return
  }

  const qsos = selectQSOs(getState(), options.operation.uuid)
  const timestamp = Date.now()
  for (const qso of qsos) {
    const qsl = qso.qsl || {}

    const hookPromises = hooks.map(hook => hook.confirmQSO({
      operation: options.operation,
      qso,
      timestamp,
      dispatch
    }).then(confirmation => {
      qsl[hook.confirmationName] = confirmation
    }))
    await Promise.all(hookPromises)

    const newQso = { ...qso, qsl }
    dispatch(actions.addQSO({ uuid: options.operation.uuid, qso: newQso }))
  }
}
