/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { useSelector } from 'react-redux'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import { selectSectionedQSOs } from '../../store/qsos'

import { OpInfoPanel } from './OpInfoTab/components/OpInfoPanel'
import ScreenContainer from '../components/ScreenContainer'

export default function OpInfoScreen ({ navigation, route }) {
  const call = route?.params?.call
  const operation = route?.params?.operation ?? {}

  const safeAreaInsets = useSafeAreaInsets()

  const { sections, qsos, activeQSOs } = useSelector(state => selectSectionedQSOs(state, operation?.uuid))

  const styles = useThemedStyles()

  // useEffect(() => {
  //   navigation.setOptions({ title: "" })
  // }, [navigation, call])

  return (
    <ScreenContainer>
      <GestureHandlerRootView
        style={{
          flex: 1,
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'stretch'
        }}
      >
        <OpInfoPanel
          style={{ paddingBottom: safeAreaInsets.bottom, paddingRight: safeAreaInsets.right, paddingLeft: safeAreaInsets.left }}
          styles={styles}
          themeColor={'tertiary'}
          call={call}
          sections={sections}
          qsos={qsos}
          activeQSOs={activeQSOs}
          operation={operation}
        />
      </GestureHandlerRootView>
    </ScreenContainer>
  )
}
