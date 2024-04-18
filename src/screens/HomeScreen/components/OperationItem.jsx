/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { View } from 'react-native'
import { Text, TouchableRipple } from 'react-native-paper'
import { fmtDateTimeDynamic } from '../../../tools/timeFormats'
import { Ham2kMarkdown } from '../../components/Ham2kMarkdown'

export default function OperationItem ({ operation, settings, onPress, styles }) {
  const pressHandler = useCallback(() => {
    onPress && onPress(operation)
  }, [onPress, operation])

  return (
    <TouchableRipple onPress={pressHandler}>
      <View style={[styles.row, { flexDirection: 'column', width: '100%' }]}>
        <View style={[{ flexDirection: 'row', width: '100%' }]}>
          <View style={{ flex: 0, flexDirection: 'row', marginLeft: 0, minWidth: styles.oneSpace * 2 }}>
            {/* <Text style={[styles.text.callsign, styles.rowText]}>{operation.stationCall || settings.operatorCall}{' '}</Text>
            <Text style={[styles.rowText, { fontWeight: 'bold' }]}><Ham2kMarkdown>{operation.title}</Ham2kMarkdown></Text> */}
            <Ham2kMarkdown style={styles.rowText}>**`{operation.stationCall || settings.operatorCall}`**{' '}{operation.title}</Ham2kMarkdown>
          </View>
        </View>
        <View style={[{ flexDirection: 'row', width: '100%', paddingTop: styles.halfSpace }]}>
          {operation.qsoCount > 0 ? (
            <>
              <Text style={[styles.rowText, { fontSize: styles.smallFontSize }]}>{operation.qsoCount} {operation.qsoCount > 1 ? 'QSOs' : 'QSO'}{' • '}</Text>
              <Text style={[styles.rowText, { fontSize: styles.smallFontSize }]}>{fmtDateTimeDynamic(operation.startOnMillisMax)}</Text>
            </>
          ) : (
            <Text style={[styles.rowText, { fontSize: styles.smallFontSize }]}>No QSOs</Text>
          )}
        </View>
      </View>
    </TouchableRipple>
  )
}
