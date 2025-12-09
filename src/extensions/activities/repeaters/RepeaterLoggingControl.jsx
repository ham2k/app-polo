/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch } from 'react-redux'

import { setOperationData } from '../../../store/operations'
import { setVFO } from '../../../store/station/stationSlice'
import { capitalizeString } from '../../../tools/capitalizeString'
import { fmtFreqInMHz } from '../../../tools/frequencyFormats'
import { findRef, removeRef, replaceRef } from '../../../tools/refTools'
import { filterRefs, refsToString, replaceRefs, stringToRefs } from '../../../tools/refTools'
import { H2kDropDown, H2kListItem, H2kListRow, H2kListSection, H2kMarkdown, H2kTextInput } from '../../../ui'

import { Info } from './RepeaterInfo'

export function RepeaterLoggingControl(props) {
  const { qso, updateQSO, style, styles } = props

  const handleChange = (text) => {
    updateQSO({
      their: {
        ...qso?.their,
        grid: text
      }
    })
  }

  return (
    <H2kTextInput
      {...props}
      style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
      textStyle={styles.text.callsign}
      label={'Location'}
      mode={'flat'}
      uppercase={true}
      noSpaces={true}
      value={qso?.their?.grid || ''}
      onChangeText={handleChange}
    />
  )
}