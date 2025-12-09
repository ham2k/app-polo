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

import { ScrollView, View } from 'react-native'

import { Info } from './RepeaterInfo'

export function RepeaterLoggingControl(props) {
  const { qso, updateQSO, style, styles } = props

  const handleChange = (section, field) => (text) => {
    updateQSO({
      [section]: {
        ...qso?.[section],
        [field]: text
      }
    })
  }

  return (
    <View style={[style, { flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }]}>
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
          textStyle={styles.text.callsign}
          label={'RPT Call'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          value={qso?.rpt?.call || ''}
          onChangeText={handleChange('rpt', 'call')}
        />
        <H2kTextInput
          style={[styles.input, { marginTop: styles.oneSpace, flex: 1 }]}
          textStyle={styles.text.callsign}
          label={'RPT Grid'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          value={qso?.rpt?.grid || ''}
          onChangeText={handleChange('rpt', 'grid')}
        />
    </View>
  )
}