import React, { useEffect, useMemo, useState } from 'react'

import { View } from 'react-native'
import { useSelector } from 'react-redux'

import { selectOperation } from '../../../store/operations'
import { useThemedStyles } from '../../../styles/tools/useThemedStyles'
import LoggingPanel from './components/LoggingPanel'
import QSOList from './components/QSOList'
import { selectQSOs } from '../../../store/qsos'
import { selectSettings } from '../../../store/settings'
import { useUIState } from '../../../store/ui'

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
  const activeQSOs = useMemo(() => qsos.filter(qso => !qso.deleted), [qsos])

  const settings = useSelector(selectSettings)

  // eslint-disable-next-line no-unused-vars
  const [loggingState, setLoggingState] = useUIState('OpLoggingTab', 'loggingState', {})

  useEffect(() => {
    if (route?.params?.qso) {
      setLoggingState({ selectedKey: 'suggested-qso', suggestedQSO: route.params.qso })
    }
  }, [route?.params?.qso, setLoggingState])

  // Set navigation title
  useEffect(() => {
    navigation.setOptions({ title: `${activeQSOs.length} ${activeQSOs.length !== 1 ? 'QSOs' : 'QSO'}`, iconName: 'radio' })
  }, [navigation, activeQSOs])

  return (
    <View style={flexOne}>
      <QSOList
        style={flexOne}
        styles={styles}
        qsos={qsos}
        operation={operation}
        settings={settings}
      />

      <LoggingPanel
        style={flexZero}
        operation={operation}
        qsos={qsos}
        activeQSOs={activeQSOs}
        settings={settings}
      />
    </View>
  )
}
