import React, { useCallback, useMemo } from 'react'
import { Text, View } from 'react-native'
import { TouchableRipple } from 'react-native-paper'
import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'

export function NumberKeys ({ themeColor, onNumberKeyPressed, enabled }) {
  const styles = useThemedStyles((baseStyles) => {
    const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
    return {
      root: {
        backgroundColor: baseStyles.theme.colors[`${themeColor}Light`],
        flexDirection: 'row',
        justifyContent: 'space-around',
        padding: baseStyles.halfSpace
      },
      key: {
        fontSize: baseStyles.normalFontSize * 1.2,
        fontWeight: 'bold',
        width: baseStyles.normalFontSize * 2,
        padding: baseStyles.halfSpace,
        textAlign: 'center'
      },
      enabledKey: {
        color: baseStyles.theme.colors[`on${upcasedThemeColor}`]
      },
      disabledKey: {
        color: baseStyles.theme.colors[`${themeColor}Container`],
        fontWeight: 'normal'
      }
    }
  })

  return (
    <View style={[styles.root]}>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(1)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>1</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(2)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>2</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(3)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>3</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(4)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>4</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(5)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>5</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(6)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>6</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(7)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>7</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(8)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>8</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(9)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>9</Text></TouchableRipple>
      <TouchableRipple onPress={() => onNumberKeyPressed && onNumberKeyPressed(0)}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>0</Text></TouchableRipple>
    </View>
  )
}
