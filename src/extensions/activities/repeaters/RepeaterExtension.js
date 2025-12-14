import React from 'react'
import { findRef, replaceRef } from '../../../tools/refTools'
import { H2kGridInput } from '../../../ui'
import { Info } from './RepeaterInfo'
import { RepeaterLoggingControl } from './RepeaterLoggingControl'

const Extension = {
  ...Info,
  enabledByDefault: false,
  category: 'other',
  onActivationDispatch: ({ registerHook }) => async () => {
    registerHook('activity', { hook: ActivityHook })
    registerHook(`ref:${Info.refType}`, { hook: ReferenceHandler })
  }
}

export default Extension

const ActivityHook = {
  ...Info,
  mainExchangeForQSO,
  loggingControls: () => [LoggingControl],
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
  label: ({ qso }) => {
    const ref = findRef(qso?.refs, Info.refType)
    return ref?.ref ? `✓ ${ref.ref.split('/')[0]}` : Info.shortName
  },
  InputComponent: RepeaterLoggingControl,
  inputWidthMultiplier: 40,
  optionType: 'optional'
}

function mainExchangeForQSO({ qso, updateQSO, styles, refStack, disabled, themeColor }) {
  if (!findRef(qso, Info.refType)) return []
  return [
    <H2kGridInput
      themeColor={themeColor}
      key={`${Info.key}/grid`}
      innerRef={refStack.shift()}
      style={[styles.input, { minWidth: styles.oneSpace * 7, flex: 1 }]}
      textStyle={styles.text.callsign}
      label="Grid"
      mode="flat"
      value={qso?.their?.grid || ''}
      disabled={disabled}
      onChangeText={(text) =>
        updateQSO({ their: { grid: text, exchange: text } })
      }
    />
  ]
}
//TO DO: add adif export handler
const ReferenceHandler = {
  ...Info,
  iconForQSO: Info.icon,

  relevantInfoForQSOItem: ({ qso }) =>
    qso.their?.grid ? [qso.their.grid.substring(0, 4)] : []
}