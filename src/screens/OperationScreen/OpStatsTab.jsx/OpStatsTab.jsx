import React from 'react'

import { View } from 'react-native'
import { Text } from 'react-native-paper'

import { useThemedStyles } from '../../../styles/tools/useThemedStyles'

export default function OpStatsTab ({ navigation, route }) {
  const styles = useThemedStyles((baseStyles) => {
    return {
      ...baseStyles,
      panel: {
        backgroundColor: baseStyles.theme.colors.secondaryContainer,
        borderBottomColor: baseStyles.theme.colors.secondaryLight,
        borderBottomWidth: 1
      },
      container: {
        paddingHorizontal: baseStyles.oneSpace,
        paddingTop: baseStyles.oneSpace,
        paddingBottom: baseStyles.oneSpace,
        gap: baseStyles.halfSpace
      }
    }
  })

  return (
    <View style={[{ flex: 1, height: '100%', width: '100%', flexDirection: 'column' }, styles.panel]}>

      <View style={[{ flex: 0, flexDirection: 'column' }, styles.container]}>
        <Text>Stats</Text>

      </View>
    </View>
  )
}
