/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'

import { findRef, replaceRef } from '../../../tools/refTools'
import GridInput from '../../../screens/components/GridInput'
import { SatelliteData, registerSatelliteData } from './SatelliteData'
import { Info } from './SatellitesInfo'
import { SatellitesLoggingControl } from './SatellitesLoggingControl'
import { loadDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { bandForFrequency } from '@ham2k/lib-operation-data'

const Extension = {
  ...Info,
  enabledByDefault: false,
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
  mainExchangeForQSO,
  loggingControls: ({ operation, settings }) => {
    return [LoggingControl]
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

function mainExchangeForQSO (props) {
  const { qso, updateQSO, styles, disabled, refStack, onSubmitEditing, keyHandler, focusedRef } = props
  const fields = []

  if (findRef(qso, Info.refType)) {
    fields.push(
      <GridInput
        key={`${Info.key}/grid`}
        innerRef={refStack.shift()}
        style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
        textStyle={styles.text.callsign}
        label={'Grid'}
        placeholder={''}
        mode={'flat'}
        value={qso?.their?.grid || ''}
        disabled={disabled}
        onChangeText={(text) => updateQSO({
          their: { grid: text }
        })}
        onSubmitEditing={onSubmitEditing}
        onKeyPress={keyHandler}
        focusedRef={focusedRef}
      />
    )
  }
  return fields
}

const ReferenceHandler = {
  ...Info,

  iconForQSO: Info.icon,

  adifFieldsForOneQSO: ({ qso, operation, common }) => {
    const ref = findRef(qso, Info.refType)
    const [satName, satFreq, satMode] = ref?.ref?.split('/')
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
  }
}
