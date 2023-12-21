import React, { useCallback, useEffect } from 'react'

import { FlatList, Text, View } from 'react-native'
import { AnimatedFAB } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { GestureHandlerRootView } from 'react-native-gesture-handler'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { addNewOperation, loadOperationsList, selectOperationsList } from '../../store/operations'
import OperationItem from './components/OperationItem'
import { selectSettings } from '../../store/settings'

export default function HomeScreen ({ navigation }) {
  const styles = useThemedStyles()
  const dispatch = useDispatch()
  const operations = useSelector(selectOperationsList)
  const settings = useSelector(selectSettings)

  useEffect(() => {
    navigation.setOptions({ rightAction: 'cog', onRightActionPress: () => navigation.navigate('Settings') })
  }, [navigation])

  useEffect(() => {
    dispatch(loadOperationsList())
  }, [dispatch])

  const handleNewOperation = useCallback(() => {
    dispatch(addNewOperation({ stationCall: settings.operatorCall, name: 'New Operation' }))
  }, [dispatch, settings])

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
              <View style={[styles.row, { flexDirection: 'column', width: '100%' }]}>
                <View style={[{ flexDirection: 'row', width: '100%' }]}>
                  <View style={{ flex: 0, marginLeft: 0 }}>
                    <Text style={[styles.rowText, { fontWeight: 'bold' }]}>No Operations</Text>
                  </View>
                </View>
              </View>
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
