import React, { createContext, useEffect, useRef, useState } from 'react'

import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { selectOperation } from '../../../store/operations'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import LoggingPanel from './components/LoggingPanel'
import QSOList from './components/QSOList'
import { selectQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'

export const OperationContext = createContext()

function prepareStyles (themeStyles, themeColor) {
  return {
    ...themeStyles,
    root: {
      borderTopColor: themeStyles.theme.colors[`${themeColor}Light`],
      borderTopWidth: 1,
      backgroundColor: themeStyles.theme.colors[`${themeColor}Container`]
    },
    input: {
      backgroundColor: themeStyles.theme.colors.background,
      color: themeStyles.theme.colors.onBackground,
      paddingHorizontal: themeStyles.oneSpace
    }
  }
}

const flexOne = { flex: 1 }
const flexZero = { flex: 0 }

export default function OpLoggingTab ({ navigation, route }) {
  const styles = useThemedStyles((baseStyles) => prepareStyles(baseStyles))

  const operation = useSelector(selectOperation(route.params.operation.uuid))
  const qsos = useSelector(selectQSOs(route.params.operation.uuid))
  const settings = useSelector(selectSettings)

  const [selectedKey, setSelectedKey] = useState(undefined)
  const [lastKey, setLastKey] = useState(undefined)

  const operationContext = {
    operation,
    qsos,
    settings,
    selectedKey,
    setSelectedKey,
    lastKey,
    setLastKey
  }

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({ title: `${qsos.length} ${qsos.length !== 1 ? 'QSOs' : 'QSO'}`, iconName: 'radio' })
  }, [navigation, qsos])
  return (
    <OperationContext.Provider value={operationContext}>
      <View style={flexOne}>
        <QSOList style={flexOne} styles={styles} qsos={qsos} selectedKey={selectedKey} setSelectedKey={setSelectedKey} lastKey={lastKey} />
        <LoggingPanel style={flexZero} />
      </View>
    </OperationContext.Provider>
  )
}
