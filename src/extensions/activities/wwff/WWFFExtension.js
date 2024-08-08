/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { findRef, refsToString } from '../../../tools/refTools'

import { Info } from './WWFFInfo'
import { registerWWFFDataFile, wwffFindOneByReference } from './WWFFDataFile'
import { WWFFActivityOptions } from './WWFFActivityOptions'
import { WWFFLoggingControl } from './WWFFLoggingControl'
import { WWFFPostSpot } from './WWFFPostSpot'
import { apiGMA } from '../../../store/apiGMA'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook('spots', { hook: SpotsHook })
    registerHook(`ref:${Info.huntingType}`, { hook: ReferenceHandler })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerWWFFDataFile()
    await dispatch(loadDataFile('wwff-all-parks', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('wwff-all-parks'))
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  MainExchangePanel: null,
  loggingControls: ({ operation, settings }) => {
    if (findRef(operation, Info.activationType)) {
      return [ActivatorLoggingControl]
    } else {
      return [HunterLoggingControl]
    }
  },
  postSpot: WWFFPostSpot,
  Options: WWFFActivityOptions,

  includeControlForQSO: ({ qso, operation }) => {
    if (findRef(operation, Info.activationType)) return true
    if (findRef(qso, Info.huntingType)) return true
    else return false
  },

  labelControlForQSO: ({ operation, qso }) => {
    const opRef = findRef(operation, Info.activationType)
    let label = opRef ? Info.shortNameDoubleContact : Info.shortName
    if (findRef(qso, Info.huntingType)) label = `✓ ${label}`
    return label
  }
}

const SpotsHook = {
  ...Info,
  sourceName: 'WWFFwatch',
  fetchSpots: async ({ online, settings, dispatch }) => {
    let spots = []
    if (online) {
      const apiPromise = await dispatch(apiGMA.endpoints.spots.initiate('wwff', { forceRefetch: true }))
      await Promise.all(dispatch(apiGMA.util.getRunningQueriesThunk()))
      const apiResults = await dispatch((_dispatch, getState) => apiGMA.endpoints.spots.select('wwff')(getState()))

      apiPromise.unsubscribe && apiPromise.unsubscribe()
      spots = apiResults.data || []
    }
    const qsos = spots.map(spot => {
      const qso = {
        their: { call: spot.ACTIVATOR },
        freq: spot.frequency,
        band: spot.band,
        mode: spot.mode,
        refs: [{
          ref: spot.REF,
          type: Info.huntingType
        }],
        spot: {
          timeInMillis: spot.timeInMillis,
          source: Info.key,
          icon: Info.icon,
          label: `${spot.REF}: ${spot.NAME}`,
          sourceInfo: {
            comments: spot.TEXT,
            spotter: spot.SPOTTER
          }
        }
      }
      return qso
    })
    const dedupedQSOs = []
    const includedCalls = {}
    for (const qso of qsos) {
      if (!includedCalls[qso.their.call]) {
        includedCalls[qso.their.call] = true
        dedupedQSOs.push(qso)
      }
    }
    return dedupedQSOs
  }
}

const HunterLoggingControl = {
  key: `${Info.key}/hunter`,
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = [Info.shortName]
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: WWFFLoggingControl,
  optionType: 'optional'
}

const ActivatorLoggingControl = {
  key: `${Info.key}/activator`,
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const parts = [Info.shortNameDoubleContact]
    if (findRef(qso, Info.huntingType)) parts.unshift('✓')
    return parts.join(' ')
  },
  InputComponent: WWFFLoggingControl,
  optionType: 'mandatory'
}

const ReferenceHandler = {
  ...Info,

  description: (operation) => refsToString(operation, Info.activationType),

  iconForQSO: Info.icon,

  decorateRefWithDispatch: (ref) => async () => {
    if (ref.ref) {
      const data = await wwffFindOneByReference(ref.ref)
      if (data) {
        return { ...ref, name: data.name, location: data.region, grid: data.grid }
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
        // Note that compact format uses _ instead of - because of WWFF requirements
        nameTemplate: settings.useCompactFileNames ? '{call}@{ref}_{compactDate}' : '{date} {call} at {ref}',
        titleTemplate: `{call}: ${Info.shortName} at ${[ref.ref, ref.name].filter(x => x).join(' - ')} on {date}`
      }]
    }
  },

  adifFieldsForOneQSO: ({ qso, operation, common }) => {
    const huntingRef = findRef(qso, Info.huntingType)
    const activationRef = findRef(operation, Info.activationType)
    const fields = []
    if (activationRef) fields.push({ MY_SIG: 'WWFF' }, { MY_SIG_INFO: activationRef.ref })
    if (huntingRef) fields.push({ SIG: 'WWFF' }, { SIG_INFO: huntingRef.ref })

    return fields
  }

}
