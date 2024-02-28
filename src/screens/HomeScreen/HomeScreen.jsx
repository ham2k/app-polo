import React, { useCallback, useEffect } from 'react'

import { FlatList, Text, View } from 'react-native'
import { AnimatedFAB } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { addNewOperation, getOperations, selectOperationsList } from '../../store/operations'
import OperationItem from './components/OperationItem'
import { selectSettings } from '../../store/settings'
import { loadAllDataFiles } from '../../store/dataFiles/actions/dataFileFS'
import { setupOnlineStatusMonitoring } from '../../store/system'

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

  useEffect(() => {
    dispatch(getOperations())
  }, [dispatch])

  useEffect(() => {
    setTimeout(() => {
      dispatch(loadAllDataFiles())
    }, 100)
  }, [dispatch])

  useEffect(() => {
    dispatch(setupOnlineStatusMonitoring())
  }, [dispatch])

  const handleNewOperation = useCallback(async () => {
    const operation = await dispatch(addNewOperation({ stationCall: settings.operatorCall, title: 'New Operation' }))
    navigation.navigate('Operation', { uuid: operation.uuid, operation, isNew: true })
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
      </View>
      <AnimatedFAB
        icon="plus"
        label="New Operation"
        extended={isExtended}
        style={[{ bottom: styles.oneSpace * 4, right: styles.oneSpace * 4, position: 'absolute' }]}
        onPress={handleNewOperation}
      />
    </ScreenContainer>
  )
}
