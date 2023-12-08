import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  Text,
  View
} from 'react-native'
import { IconButton } from 'react-native-paper'

import { fmtShortTimeZulu } from '../../../../tools/timeFormats'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import LoggerInput from '../LoggerInput'
import LoggerChip from '../LoggerChip'

export default function OperationPanel ({ operation }) {
  const styles = useThemedStyles()
  const [isRadioOpen, setIsRadioOpen] = useState(false)
  const [isPOTAOpen, setIsPOTAOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)

  const anyPanelOpen = useMemo(() => {
    return isRadioOpen || isPOTAOpen || isLocationOpen
  }, [isRadioOpen, isPOTAOpen, isLocationOpen])

  return (
    <View style={{ flex: 0, width: '100%', flexDirection: 'column', backgroundColor: styles.theme.colors.secondaryContainer }}>
      <View style={{ paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.oneSpace, borderBottomColor: styles.theme.colors.secondaryLight, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: styles.halfSpace }}>
        <LoggerChip icon="radio" themeColor="secondary">7.325 MHz • CW • 20W</LoggerChip>
        <LoggerChip icon="pine-tree" themeColor="secondary">POTA K-1233</LoggerChip>
        <LoggerChip icon="map-marker" themeColor="secondary">FN21na</LoggerChip>
      </View>
      {anyPanelOpen && (
        <View style={{ paddingHorizontal: styles.oneSpace, paddingTop: styles.oneSpace, paddingBottom: styles.oneSpace, borderBottomColor: styles.theme.colors.secondaryLight, borderBottomWidth: 1, flexDirection: 'row', flexWrap: 'wrap', gap: styles.halfSpace }} />
      )}
    </View>
  )
}
