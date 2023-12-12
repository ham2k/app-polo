import React, { useState } from 'react'

import { View } from 'react-native'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import LoggerChip from '../../components/LoggerChip'
import OperationSettings from '../OperationSettings'

function describeRadio (operation) {
  return `${operation.freq ?? '000'} MHz • ${operation.mode ?? 'SSB'} • ${operation.power ?? '?'}W`
}

export default function OperationPanel ({ operation }) {
  const styles = useThemedStyles((themedStyles) => ({
    ...themedStyles,
    panel: {
      backgroundColor: themedStyles.theme.colors.secondaryContainer,
      borderBottomColor: themedStyles.theme.colors.secondaryLight,
      borderBottomWidth: 1
    },
    paperInput: {
      backgroundColor: themedStyles.theme.colors.surface,
      color: themedStyles.theme.colors.onSurface
    },
    nativeInput: {
      backgroundColor: themedStyles.theme.colors.surface,
      color: themedStyles.theme.colors.onSurface
    },
    container: {
      paddingHorizontal: themedStyles.oneSpace,
      paddingTop: themedStyles.oneSpace,
      paddingBottom: themedStyles.oneSpace,
      gap: themedStyles.halfSpace
    }
  }))

  const [isRadioOpen, setIsRadioOpen] = useState(false)
  const [isPOTAOpen, setIsPOTAOpen] = useState(false)
  const [isLocationOpen, setIsLocationOpen] = useState(false)

  return (
    <View style={[{ flex: 0, width: '100%', flexDirection: 'column' }, styles.panel]}>
      {isRadioOpen && (
        <View style={{ flex: 0, flexDirection: 'column' }}>
          <OperationSettings operation={operation} />
        </View>
      )}
      <View style={[{ flexDirection: 'row', flexWrap: 'wrap' }, styles.container]}>
        {!isRadioOpen && <LoggerChip icon="radio" themeColor="secondary" onChange={(val) => setIsRadioOpen(val)}>{describeRadio(operation)}</LoggerChip>}
        {!isPOTAOpen && <LoggerChip icon="pine-tree" themeColor="secondary" selected={isPOTAOpen} onChange={(val) => setIsPOTAOpen(val)}>POTA K-1233</LoggerChip>}
        {!isLocationOpen && <LoggerChip icon="map-marker" themeColor="secondary" selected={isLocationOpen} onChange={(val) => setIsLocationOpen(val)}>FN21na</LoggerChip>}
      </View>
    </View>
  )
}
