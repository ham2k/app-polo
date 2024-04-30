/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { findRef, refsToString } from '../../../tools/refTools'

import { Info } from './ELAInfo'
import { elaFindOneByReference, registerELADataFile } from './ELADataFile'
import { ELAActivityOptions } from './ELAActivityOptions'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerELADataFile()
    await dispatch(loadDataFile('ela-all-lighthouses', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('ela-all-lighthouses'))
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  MainExchangePanel: null,
  Options: ELAActivityOptions
}

const ReferenceHandler = {
  ...Info,

  description: (operation) => refsToString(operation, Info.activationType),

  decorateRefWithDispatch: (ref) => async () => {
    if (ref.ref) {
      const reference = await elaFindOneByReference(ref.ref)
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
  }

}
