/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo,useRef } from 'react'
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
    <View style={[style, { flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }]} keyboardShouldPersistTaps={'handled'}>
        <H2kTextInput
          textStyle={styles.text.callsign}
          label={'RPT Call'}
          mode={'flat'}
          uppercase={true}
          noSpaces={true}
          value={qso?.rpt?.call || ''}
          onChangeText={handleChange('rpt', 'call')}
          keyboard="dumb"
        />
        <H2kTextInput
          textStyle={styles.text.grid}
          label={'RPT Grid'}
          mode={'flat'}
          noSpaces={true}
          value={qso?.rpt?.grid || ''}
          onChangeText={handleChange('rpt', 'grid')}
          keyboard="dumb"
        />
        <H2kTextInput
          textStyle={styles.text}
          label={'RPT RX'}
          mode={'flat'}
          noSpaces={true}
          value={qso?.rpt?.rx|| ''}
          onChangeText={handleChange('rpt', 'rx')}
          keyboard="dumb"
        />
    </View>
  )
}