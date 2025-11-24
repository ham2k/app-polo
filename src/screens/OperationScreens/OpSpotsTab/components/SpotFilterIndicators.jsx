/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { Icon } from 'react-native-paper'
import { View } from 'react-native'
import { TouchableOpacity } from 'react-native-gesture-handler'

import LoggerChip from '../../components/LoggerChip'
import { LABEL_FOR_MODE } from './SpotsPanel'
import { superModeForMode } from '@ham2k/lib-operation-data'

export default function SpotFilterIndicators ({ vfo, options, counts, operation, filterState, onPress, styles, themeColor, settings, online }) {
  return (
    <TouchableOpacity onPress={onPress} style={{ flex: 0, flexDirection: 'column', paddingHorizontal: 0, gap: styles.oneSpace, alignItems: 'center' }}>
      <View style={{ flex: 0, flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace, alignItems: 'center' }}>
        {!online && (
          <Icon
            source={'cloud-off-outline'}
            size={styles.oneSpace * 4}
            color={styles.theme.colors[`${themeColor}ContainerVariant`]}
          />
        )}

        <LoggerChip
          icon={'radio'}
          style={{ flex: 0 }} styles={styles} themeColor={themeColor}
          selected={false}
        >
          {[labelForBand(filterState.band, vfo), labelForMode(filterState.mode, vfo)].join(' • ')}
        </LoggerChip>

        {filterState.ageInMinutes > 0 && (
          <LoggerChip
            icon={'clock-outline'}
            style={{ flex: 0 }} styles={styles} themeColor={themeColor}
            selected={false}
          >
            {`${filterState.ageInMinutes} min`}
          </LoggerChip>
        )}
      </View>
    </TouchableOpacity>
  )
}

function labelForBand (band, vfo) {
  if (!band || band === 'any') return 'All Bands'
  else if (band === 'auto') return vfo?.band || 'Auto'
  else return band
}

function labelForMode (mode, vfo) {
  if (!mode || mode === 'any') return 'All modes'
  else if (mode === 'notDigital') return `${LABEL_FOR_MODE.PHONE} + ${LABEL_FOR_MODE.CW}`
  else if (mode === 'auto') return vfo.mode ? LABEL_FOR_MODE[superModeForMode(vfo?.mode)] : 'Auto'
  else return LABEL_FOR_MODE[superModeForMode(mode)] || superModeForMode(mode)
}
