import React, { useEffect, useState } from 'react'

import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { selectOperation } from '../../../store/operations'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import LoggingPanel from './components/LoggingPanel'
import QSOList from './components/QSOList'
import { selectQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'

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

  const operation = useSelector(state => selectOperation(state, route.params.operation.uuid))
  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)

  const [selectedKey, setSelectedKey] = useState(undefined)
  const [lastKey, setLastKey] = useState(undefined)

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({ title: `${qsos.length} ${qsos.length !== 1 ? 'QSOs' : 'QSO'}`, iconName: 'radio' })
  }, [navigation, qsos])

  return (
    <View style={flexOne}>
      <QSOList
        style={flexOne}
        styles={styles}
        qsos={qsos}
        operation={operation}
        selectedKey={selectedKey}
        setSelectedKey={setSelectedKey}
        lastKey={lastKey}
      />

      <LoggingPanel
        style={flexZero}
        operation={operation}
        qsos={qsos}
        settings={settings}
        selectedKey={selectedKey}
        setSelectedKey={setSelectedKey}
        lastKey={lastKey}
        setLastKey={setLastKey}
        suggestedQSO={route?.params?.qso}
      />
    </View>
  )
}
