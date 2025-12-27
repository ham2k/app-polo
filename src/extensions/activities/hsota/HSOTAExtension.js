/*
 * Copyright ©️ 2004-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { loadDataFile, removeDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { findRef, refsToString } from '../../../tools/refTools'
import { LOCATION_ACCURACY } from '../../constants'

import { HSOTAActivityOptions } from './HSOTAActivityOptions'
import { registerHSOTADataFile, hsotaFindOneByReference, hsotaFindAllByLocation } from './HSOTADataFile'
import { Info } from './HSOTAInfo'
import { gridToLocation } from '@ham2k/lib-maidenhead-grid'
import { distanceOnEarth } from '../../../tools/geoTools'

const Extension = {
  ...Info,
  category: 'locationBased',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.activationType}`, { hook: ReferenceHandler })

    registerHSOTADataFile()
    await dispatch(loadDataFile('hsota-all-references', { noticesInsteadOfFetch: true }))
  },
  onDeactivationDispatch: () => async (dispatch) => {
    await dispatch(removeDataFile('hsota-all-references'))
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  MainExchangePanel: null,
  Options: HSOTAActivityOptions,

  sampleOperations: ({ settings, callInfo }) => {
    return [
      // Regular Activation
      { refs: [{ type: Info.activationType, ref: 'CA/AB-123', name: 'Example Site 1', shortName: 'Site 1', program: Info.shortName, label: `${Info.shortName} CA/AB-123: Example Site 1`, shortLabel: `${Info.shortName} CA/AB-123` }] }
    ]
  }

}

const ReferenceHandler = {
  ...Info,

  shortDescription: (operation) => refsToString(operation, Info.activationType),

  description: (operation) => {
    const ref = findRef(operation, Info.activationType)
    return [ref.ref, ref.name].filter(x => x).join(' • ')
  },

  iconForQSO: Info.icon,

  decorateRefWithDispatch: (ref) => async () => {
    if (ref.ref) {
      const data = await hsotaFindOneByReference(ref.ref)
      if (data) {
        return {
          ...ref,
          name: data.name,
          grid: data.grid,
          accuracy: LOCATION_ACCURACY.REASONABLE,
          label: `${Info.shortName} ${ref.ref}: ${data.name}`,
          shortLabel: `${Info.shortName} ${ref.ref}`,
          program: Info.shortName
        }
      } else {
        return { ...ref, name: Info.unknownReferenceName, program: Info.shortName }
      }
    }
  },

  extractTemplate: ({ ref, operation }) => {
    return { type: ref.type }
  },

  updateFromTemplateWithDispatch: ({ ref, operation }) => async (dispatch) => {
    if (operation?.grid) {
      const [lat, lon] = gridToLocation(operation.grid)

      let nearby = await hsotaFindAllByLocation(lat, lon, 0.25)
      nearby = nearby.map(result => ({
        ...result,
        distance: distanceOnEarth(result, { lat, lon })
      })).sort((a, b) => (a.distance ?? 9999999999) - (b.distance ?? 9999999999))

      if (nearby.length > 0) return { type: ref.type, ref: nearby[0]?.ref }
      else return { type: ref.type, name: 'No sites nearby!' }
    } else {
      return { type: ref.type }
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
    if (ref?.type === Info.activationType && ref?.ref) {
      return [{
        format: 'adif',
        exportType: `${Info.key}-activator`,
        exportName: 'HSOTA Activation',
        exportData: { refs: [ref] }, // exports only see this one ref
        nameTemplate: '{{>RefActivityName}}',
        titleTemplate: '{{>RefActivityTitle}}'
      }]
    }
  }
}
