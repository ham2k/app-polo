/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'

import { FlatList, View } from 'react-native'
import { AnimatedFAB, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { addNewOperation, selectOperationsList } from '../../store/operations'
import OperationItem from './components/OperationItem'
import { selectSettings } from '../../store/settings'
import Notices from './components/Notices'

export default function HomeScreen ({ navigation }) {
  const styles = useThemedStyles()
  const dispatch = useDispatch()
  const operations = useSelector(selectOperationsList)
  const settings = useSelector(selectSettings)

  useEffect(() => {
    if (!settings?.operatorCall) {
      setTimeout(() => {
        navigation.navigate('Settings')
      }, 500)
    }
  }, [settings, navigation])

  useEffect(() => {
    navigation.setOptions({ rightAction: 'cog', onRightActionPress: () => navigation.navigate('Settings') })
  }, [navigation])

  const handleNewOperation = useCallback(async () => {
    const operation = await dispatch(addNewOperation({ stationCall: settings.operatorCall, title: 'New Operation' }))
    navigation.navigate('Operation', { uuid: operation.uuid, operation, _isNew: true })
  }, [dispatch, settings, navigation])

  const navigateToOperation = useCallback((operation) => {
    navigation.navigate('Operation', { uuid: operation.uuid, operation })
  }, [navigation])

  const renderRow = useCallback(({ item }) => {
    return (
      <OperationItem key={item.uuid} operation={item} settings={settings} styles={styles} onPress={navigateToOperation} />
    )
  }, [navigateToOperation, styles, settings])

  const [isExtended, setIsExtended] = React.useState(true)

  const handleScroll = ({ nativeEvent }) => {
    const currentScrollPosition =
      Math.floor(nativeEvent?.contentOffset?.y) ?? 0

    setIsExtended(currentScrollPosition <= styles.oneSpace * 8)
  }

  return (
    <ScreenContainer>
      <View style={{ flex: 1, width: '100%', padding: 0, margin: 0 }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <FlatList
            style={{ flex: 1 }}
            data={operations}
            renderItem={renderRow}
            ListEmptyComponent={
              <Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>No Operations!</Text>
            }
            keyboardShouldPersistTaps={'handled'}
            onScroll={handleScroll}
          />
        </GestureHandlerRootView>
        <AnimatedFAB
          icon="plus"
          label="New Operation"
          extended={isExtended}
          style={[{ right: styles.oneSpace * 2, bottom: styles.oneSpace * 2 }]}
          onPress={handleNewOperation}
        />
      </View>

      <Notices />
    </ScreenContainer>
  )
}
