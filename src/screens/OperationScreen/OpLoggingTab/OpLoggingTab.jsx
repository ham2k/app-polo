import React, { useCallback, useEffect, useRef, useState } from 'react'

import { View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'

import { selectOperation, setOperationData } from '../../../store/operations'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import LoggingPanel from './components/LoggingPanel'
import QSOList from './components/QSOList'
import { addQSO, selectQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'
import cloneDeep from 'clone-deep'
import { qsoKey } from '@ham2k/lib-qson-tools'

function prepareNewQSO (operation, settings) {
  return {
    band: operation.band,
    mode: operation.mode,
    _is_new: true
  }
}

function prepareExistingQSO (qso) {
  const clone = cloneDeep(qso)
  clone._originalKey = qso.key
  clone._is_new = false
  return clone
}

export default function OpLoggingTab ({ navigation, route }) {
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
  const operation = useSelector(selectOperation(route.params.operation.uuid))
  const settings = useSelector(selectSettings)
  const qsos = useSelector(selectQSOs(route.params.operation.uuid))

  const listRef = useRef()
  const mainFieldRef = useRef()
  const focusedFieldRef = useRef()

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({ title: `${qsos.length} ${qsos.length !== 1 ? 'QSOs' : 'QSO'}`, iconName: 'radio' })
  }, [navigation, qsos])

  // When the lastQSO changes, scroll to it
  const [lastQSO, setLastQSO] = useState()
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

  const [qsoQueue, setQSOQueue] = useState([])
  const [currentQSO, setCurrentQSO] = useState(undefined)

  // When there is no current QSO, pop one from the queue or create a new one
  useEffect(() => {
    if (!currentQSO) {
      if (qsoQueue.length > 0) {
        const nextQSO = qsoQueue.pop()
        setCurrentQSO(nextQSO)
        setQSOQueue(qsoQueue)
      } else {
        setCurrentQSO(prepareNewQSO(operation, settings))
      }
      if (mainFieldRef?.current) {
        console.log('mainfield focus')
        mainFieldRef.current.focus()
      } else {
        console.log('no mainfield')
      }
    }
  }, [qsoQueue, currentQSO, operation, settings])

  const handleSelectQSO = useCallback((qso) => {
    if (qso) {
      if (currentQSO?._is_new) setQSOQueue([...qsoQueue, currentQSO])
      setCurrentQSO(prepareExistingQSO(qso))
      if (mainFieldRef?.current) {
        console.log('mainfield focus')
        mainFieldRef.current.focus()
      } else {
        console.log('no mainfield')
      }
    } else {
      setCurrentQSO(undefined) // blanking the current QSO will trigger the useEffect above to prepare the next one
    }
  }, [currentQSO, qsoQueue])

  // Log (or update) a QSO
  const logQSO = useCallback((qso) => {
    if (qso._is_new) {
      delete qso._is_new
    }

    qso.mode = qso.mode || operation.mode
    qso.freq = qso.freq || operation.freq

    if (!qso.startOnMillis) qso.startOnMillis = new Date()
    qso.startOn = new Date(qso.startOnMillis).toISOString()
    if (qso.endOnMillis) qso.endOn = new Date(qso.endOnMillis).toISOString()

    qso.our = qso.our || {}
    qso.our.call = qso.our.call || operation.stationCall || settings.operatorCall
    qso.our.sent = qso.our.sent || (operation.mode === 'CW' ? '599' : '59')

    qso.their = qso.their || {}
    qso.their.sent = qso.their.sent || (operation.mode === 'CW' ? '599' : '59')

    qso.key = qsoKey(qso)

    dispatch(addQSO({ uuid: operation.uuid, qso }))

    setLastQSO(qso)
    setCurrentQSO(undefined)
  }, [dispatch, operation, settings])

  const handleOperationChange = useCallback((attributes) => {
    dispatch(setOperationData({ uuid: operation.uuid, ...attributes }))
  }, [dispatch, operation.uuid])

  return (
    <View style={{ flex: 1 }}>
      <QSOList qsos={qsos} styles={styles} style={{ flex: 1 }} listRef={listRef} onSelect={handleSelectQSO} selected={currentQSO} />
      <LoggingPanel
        qso={currentQSO} setQSO={setCurrentQSO}
        operation={operation} settings={settings}
        onAccept={logQSO} onOperationChange={handleOperationChange}
        mainFieldRef={mainFieldRef} focusedFieldRef={focusedFieldRef}
        themeColor={currentQSO?._is_new ? 'tertiary' : 'secondary'} style={{ flex: 0 }}
      />
    </View>
  )
}
