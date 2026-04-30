/*
 * Copyright ©️ 2026 Sebastian Delmont <sd@ham2k.com>
 * Copyright ©️ 2026 Richard YO3GND <dev.9425@yo3gnd.ro>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function liveQSOEnqueueInfoForSaveContext ({ saveContext, qsos }) {
  if (saveContext?.origin !== 'live-logging') return undefined

  const action = saveContext?.action ?? (qsos.some((qso) => qso?.deleted) ? 'delete' : (saveContext?.previousQSO ? 'update' : 'create'))
  const previousQSO = action === 'update' || action === 'delete' ? saveContext?.previousQSO : undefined

  return {
    action,
    liveQSOContext: previousQSO ? { previousQSO } : undefined
  }
}
