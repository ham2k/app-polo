/*
 * Copyright ©️ 2024-2026 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useIsFocused } from '@react-navigation/native'

import { selectOperation } from '../../../store/operations'
import { selectSectionedQSOs } from '../../../store/qsos'
import { useSelectorConditionally } from '../../components/useConditionally'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

import { CallInfoPanel } from './components/CallInfoPanel'
import { OpInfoPanel } from './components/OpInfoPanel'
import { selectStateForComponentAndKey } from '../../../store/ui'

export default function OpInfoTab ({ navigation, route }) {
  const isFocused = useIsFocused()
  const operationSelector = useCallback((state) => selectOperation(state, route.params.operation.uuid), [route.params.operation.uuid])
  const operation = useSelectorConditionally(isFocused ? 'opInfoTab operation' : undefined, operationSelector)

  const qsoSelector = useCallback((state) => selectStateForComponentAndKey(state, 'OpLoggingTab', 'qso'), [])
  const qso = useSelectorConditionally(isFocused, qsoSelector)

  const sectionedQSOsSelector = useCallback((state) => selectSectionedQSOs(state, operation?.uuid), [operation?.uuid])
  const { sections, qsos, activeQSOs } = useSelectorConditionally(isFocused, sectionedQSOsSelector)

  const themeColor = useMemo(() => {
    return (!qso?._isNew ? 'secondary' : 'tertiary')
  }, [qso?._isNew])

  const styles = useThemedStyles()
  const safeAreaInsets = useSafeAreaInsets()

  return (
    <View
      style={{
        flexDirection: 'column',
        flex: 1,
        justifyContent: 'space-between',
        alignItems: 'stretch',
        paddingRight: safeAreaInsets.right,
        backgroundColor: styles.theme.colors[`${themeColor}Container`]
      }}
    >
      {qso?.their?.call ? (
        <CallInfoPanel styles={styles} style={{ paddingBottom: safeAreaInsets.bottom }} qso={qso} operation={operation} sections={sections} themeColor={themeColor} />
      ) : (
        <OpInfoPanel styles={styles} style={{ paddingBottom: safeAreaInsets.bottom }} qsos={qsos} qso={qso} activeQSOs={activeQSOs} sections={sections} operation={operation} themeColor={themeColor} />
      )}
    </View>
  )
}
