import React, { useCallback, useEffect } from 'react'

import {
  Text,
  View
} from 'react-native'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { useDispatch, useSelector } from 'react-redux'
import { addOperationQSO, loadOperation, selectOperationInfo, selectOperationQSOs } from '../../store/operations'
import QSOItem from './components/QSOItem'
import LoggerChip from './components/LoggerChip'
import LoggingPanel from './components/LoggingPanel/LoggingPanel'

export default function OperationScreen ({ navigation, route }) {
  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      input: {
        backgroundColor: baseStyles.theme.colors.background,
        color: baseStyles.theme.colors.onBackground,
        paddingHorizontal: baseStyles.oneSpace
      }
    }
  })

  const dispatch = useDispatch()
  const operation = useSelector(selectOperationInfo(route.params.operation.uuid))
  const qsos = useSelector(selectOperationQSOs(route.params.operation.uuid))

  useEffect(() => {
    navigation.setOptions({ title: operation?.call, subTitle: operation?.name })
  }, [navigation, operation])

  useEffect(() => {
    dispatch(loadOperation(route.params.operation.uuid))
  }, [route.params.operation.uuid, dispatch])

  const logNewQSO = useCallback((qso) => {
    qso.our.call = operation.call
    console.log('logNewQSO', qso)
    dispatch(addOperationQSO({ uuid: operation.uuid, qso }))
  }, [dispatch, operation])

  return (
    <ScreenContainer>
      <View style={{ flex: 0, width: '100%', flexDirection: 'column', backgroundColor: styles.theme.colors.secondaryContainer }}>
        <View style={{ paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.halfSpace, flexDirection: 'row', flexWrap: 'wrap', gap: styles.halfSpace }}>
          <LoggerChip icon="pine-tree" themeColor="secondary">POTA K-1233</LoggerChip>
          <LoggerChip icon="radio" themeColor="secondary">7.325 MHz • CW • 20W</LoggerChip>
        </View>
      </View>
      <View style={[styles.listContainer, { flex: 1 }]}>
        {qsos?.length > 0 ? (
          qsos.map((qso, index) => (
            <QSOItem qso={qso} key={qso.key} styles={styles} />
          )
          )
        ) : (
          <Text>No QSOs Yet!</Text>
        )}
      </View>
      <LoggingPanel onLog={logNewQSO} />
    </ScreenContainer>
  )
}
