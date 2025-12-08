/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'

import { bandForFrequency } from '@ham2k/lib-operation-data'

import { findRef, replaceRef } from '../../../tools/refTools'
import { loadDataFile } from '../../../store/dataFiles/actions/dataFileFS'
import { H2kGridInput } from '../../../ui'

import { Info } from './RepeaterInfo'
import { RepeaterLoggingControl } from './RepeaterLoggingControl'

const Extension = {
  ...Info,
  enabledByDefault: false,
  category: 'other',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.refType}`, { hook: ReferenceHandler })
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
  InputComponent: RepeaterLoggingControl,
  inputWidthMultiplier: 40,
  optionType: 'optional'
}

function mainExchangeForQSO (props) {
  const { qso, updateQSO, styles, refStack, disabled, themeColor } = props
  const fields = []

  if (findRef(qso, Info.refType)) {
    fields.push(
      <H2kGridInput
        {...props}
        themeColor={themeColor}
        key={`${Info.key}/grid`}
        innerRef={refStack.shift()}
        style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
        textStyle={styles.text.callsign}
        label={'Grid'}
        placeholder={qso?.their?.guess?.grid || ''}
        mode={'flat'}
        value={qso?.their?.grid || ''}
        disabled={disabled}
        onChangeText={(text) => updateQSO({
          their: { grid: text, exchange: text }
        })}
      />
    )
  }
  return fields
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

  relevantInfoForQSOItem: ({ qso, operation }) => {
    const ref = findRef(qso, Info.refType)
    if (ref?.ref && qso.their.grid) {
      return [qso.their.grid.substring(0, 4)]
    }
  }
}
