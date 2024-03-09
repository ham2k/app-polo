import React from 'react'
import { View } from 'react-native'
import { List } from 'react-native-paper'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export const ListSeparator = ({ style }) => {
  const styles = useThemedStyles()

  return <View style={[style, { backgroundColor: styles.colors.primary, height: styles.oneSpace * 1.5, borderTopWidth: 1, borderBottomWidth: 1, borderColor: styles.colors.primaryContainer }]} />
}

export const ListRow = ({ style, children }) => {
  const styles = useThemedStyles()

  return <View style={[style, { paddingLeft: styles.oneSpace * 1.5, paddingRight: styles.oneSpace * 2, minHeight: styles.oneSpace * 3 }]}>{children}</View>
}
