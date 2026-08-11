// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { bandForFrequency } from '@ham2k/lib-operation-data'
import { findRef, replaceRef } from '@ham2k/lib-qson-tools'

import { loadDataFile } from '../../../store/dataFiles/actions/dataFileFS'

import { Info } from './SatellitesInfo'
import { SatellitesLoggingControl } from './SatellitesLoggingControl'
import { SatelliteData, registerSatelliteData } from './SatelliteData'

const Extension = {
  ...Info,
  category: 'other',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.refType}`, { hook: ReferenceHandler })

    registerSatelliteData()
    dispatch(loadDataFile('satellite-data')) // Don't `await`, load in the background
  }
}
export default Extension

const ActivityHook = {
  ...Info,
  standardExchangeFields: ({ qso, operation }) => {
    return {
      grid: (findRef(operation, Info.refType)?.ref || findRef(qso, Info.refType)?.ref) ? 'always' : false
    }
  },
  loggingControls: ({ operation, settings }) => {
    // On a satellite operation, include the control automatically (mandatory); otherwise it's optional.
    if (findRef(operation, Info.refType)?.ref) {
      return [{ ...LoggingControl, optionType: 'mandatory' }]
    } else {
      return [LoggingControl]
    }
  },
  prepareNewQSO: ({ operation, qso }) => {
    if (!qso._isSuggested && operation?.satellite) {
      qso.refs = replaceRef(qso.refs, Info.refType, { type: Info.refType, ref: operation.satellite })
    }
  }
}

const LoggingControl = {
  key: Info.key,
  order: 10,
  icon: Info.icon,
  label: ({ operation, qso }) => {
    const ref = findRef(qso?.refs, Info.refType)
    if (ref?.ref) {
      const [name] = ref.ref.split('/')

      return `✓ ${name}`
    } else {
      return [Info.shortName]
    }
  },
  InputComponent: SatellitesLoggingControl,
  inputWidthMultiplier: 40,
  optionType: 'optional'
}

const ReferenceHandler = {
  ...Info,

  iconForQSO: Info.icon,

  adifFieldsForOneQSO: ({ qso, operation }) => {
    const ref = findRef(qso, Info.refType)
    const [satName, satFreq, satMode] = ref?.ref ? ref.ref.split('/') : []
    const sat = SatelliteData.satelliteByName[satName]
    if (sat) {
      const linkIndex = sat.uplinks.findIndex(link => `${link.lowerMHz}` === satFreq && link.mode === satMode)
      // const uplink = sat.uplinks[linkIndex] || sat.uplinks[0]
      const downlink = sat.downlinks[linkIndex] || sat.downlinks[0]

      const fields = []
      fields.push({ PROP_MODE: 'SAT' })
      fields.push({ SAT_NAME: satName })
      fields.push({ BAND_RX: bandForFrequency(downlink.upperMHz) })
      return fields
    }
  },

  relevantInfoForQSOItem: ({ qso }) => {
    const ref = findRef(qso, Info.refType)
    if (ref?.ref && qso.their.grid) {
      return [qso.their.grid.substring(0, 4)]
    }
  }
}
