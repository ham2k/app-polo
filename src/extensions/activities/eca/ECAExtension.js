/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { findRef, refsToString } from '../../../tools/refTools'

import { Info } from './ECAInfo'
import { ecaFindOneByReference, registerECADataFile } from './ECADataFile'
import { ECAActivityOptions } from './ECAActivityOptions'
import { ECAPostSpot } from './ECAPostSpot'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerECADataFile()
    await dispatch(loadDataFile('eca-all-castles', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('eca-all-castles'))
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  MainExchangePanel: null,
  Options: ECAActivityOptions,
  postSpot: ECAPostSpot
}

const ReferenceHandler = {
  ...Info,

  description: (operation) => refsToString(operation, Info.activationType),

  decorateRefWithDispatch: (ref) => async () => {
    if (ref.ref) {
      const reference = await ecaFindOneByReference(ref.ref)
      if (reference) {
        return { ...ref, name: reference.name, location: reference.region, grid: reference.grid }
      } else {
        return { ...ref, name: Info.unknownReferenceName ?? 'Unknown reference' }
      }
    }
  },

  suggestOperationTitle: (ref) => {
    if (ref.type === Info.activationType && ref.ref) {
      return { at: ref.ref, subtitle: ref.name }
    } else {
      return null
    }
  },

  suggestExportOptions: ({ operation, ref, settings }) => {
    if (ref.type === Info.activationType && ref.ref) {
      return [{
        format: 'adif',
        common: { refs: [ref] },
        nameTemplate: settings.useCompactFileNames ? '{call} @ {ref} {compactDate}' : '{date} {call} at {ref}',
        titleTemplate: `{call}: ${Info.shortName} at ${[ref.ref, ref.name].filter(x => x).join(' - ')} on {date}`
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation, common }) => {
    const activationRef = findRef(operation, Info.activationType)
    const fields = []
    if (activationRef) fields.push({ MY_SIG_INFO: activationRef.ref })

    return fields
  },

  scoringForQSO: ({ qso, qsos, operation, ref }) => {
    if (!ref.ref) return {}

    const { key, startOnMillis } = qso

    const dupes = qsos.filter(q => !q.deleted && (startOnMillis ? q.startOnMillis < startOnMillis : true) && q.their.call === qso.their.call && q.key !== key)
    console.log('scoring', dupes)
    if (dupes.length === 0) {
      return { counts: 1, type: Info.activationType }
    } else {
      return { counts: 0, alerts: ['duplicate'], type: Info.activationType }
    }
  }

}
