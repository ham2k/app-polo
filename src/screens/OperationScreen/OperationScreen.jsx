import React, { useCallback, useEffect, useRef, useState } from 'react'

import {
  View
} from 'react-native'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { useDispatch, useSelector } from 'react-redux'
import { addOperationQSO, loadOperation, selectOperationInfo, selectOperationQSOs } from '../../store/operations'
import LoggerChip from './components/LoggerChip'
import LoggingPanel from './components/LoggingPanel/LoggingPanel'
import QSOList from './components/QSOList'
import OperationPanel from './components/OperationPanel/OperationPanel'

function prepareNewQSO (operation) {
  return {
    our: {
      call: operation.call
    },
    band: operation.band,
    mode: operation.mode
  }
}

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

  const [lastQSO, setLastQSO] = useState()
  const [currentQSO, setCurrentQSO] = useState(prepareNewQSO(operation))

  const listRef = useRef()

  // When starting, make sure all operation data is loaded
  useEffect(() => {
    dispatch(loadOperation(route.params.operation.uuid))
  }, [route.params.operation.uuid, dispatch])

  // When operation data is loaded, set the title
  useEffect(() => {
    navigation.setOptions({ title: operation?.call, subTitle: operation?.name })
  }, [navigation, operation])

  // When the lastQSO changes, scroll to it
  useEffect(() => {
    setTimeout(() => {
      if (lastQSO) {
        const i = qsos.findIndex((qso) => qso.key === lastQSO.ket)
        if (i > -1) {
          listRef.current?.scrollToIndex({ index: i, animated: true })
        } else {
          listRef.current?.scrollToEnd()
        }
      } else {
        listRef.current?.scrollToEnd()
      }
    }, 0)
  }, [listRef, qsos, lastQSO])

  const logNewQSO = useCallback((qso) => {
    qso.our.call = operation.call

    qso.startOn = new Date(qso.startOnMillis).toISOString()
    if (qso.endOnMillis) {
      qso.endOn = new Date(qso.endOnMillis).toISOString()
    }

    console.log('logNewQSO', qso)
    dispatch(addOperationQSO({ uuid: operation.uuid, qso }))
    setLastQSO(qso)
    setCurrentQSO(prepareNewQSO(operation))
  }, [dispatch, operation])

  return (
    <ScreenContainer>
      <OperationPanel operation={operation} styles={styles} stlye={{ flex: 0 }} />

      <QSOList qsos={qsos} styles={styles} style={{ flex: 1 }} listRef={listRef} />

      <LoggingPanel onLog={logNewQSO} qso={currentQSO} style={{ flex: 0 }} />
    </ScreenContainer>
  )
}
