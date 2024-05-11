/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { Text, View, Platform } from 'react-native'
import { TouchableRipple } from 'react-native-paper'

import { useUIState } from '../../../../../store/ui/useUIState'
import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'

function prepareStyles (baseStyles, themeColor) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  return {
    ...baseStyles,
    root: {
      backgroundColor: baseStyles.theme.colors[`${themeColor}Light`],
      flexDirection: 'row',
      justifyContent: 'space-around',
      padding: baseStyles.halfSpace,
      gap: baseStyles.oneSpace
    },
    key: {
      fontSize: baseStyles.normalFontSize * 1.2,
      fontWeight: 'bold',
      textAlign: 'center'
    },
    keyTouchable: {
      flex: 1,
      paddingVertical: baseStyles.oneSpace * (baseStyles.smOrLarger ? 1 : 0.5),
      overflow: 'hidden', // or round borders never show
      borderWidth: 1,
      borderColor: baseStyles.theme.colors[`${themeColor}Light`],
      borderRadius: baseStyles.oneSpace * 1.5
    },
    disabledRoot: {
      backgroundColor: baseStyles.theme.colors[`${themeColor}Container`]
    },
    enabledKey: {
      color: baseStyles.theme.colors[`on${upcasedThemeColor}`]
    },
    disabledKey: {
      color: baseStyles.theme.colors.onBackgroundLighter,
      fontWeight: 'normal'
    }
  }
}

export function NumberKeys ({ themeColor, onNumberKeyPressed, settings, enabled }) {
  const styles = useThemedStyles(prepareStyles, themeColor)

  const [mode] = useUIState('NumberKeys', 'mode', 'numbers')

  return (
    <View style={[styles.root, enabled ? styles.enabledRoot : styles.disabledRoot]}>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('1')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>1</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('2')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>2</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('3')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>3</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('4')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>4</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('5')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>5</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('6')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>6</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('7')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>7</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('8')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>8</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('9')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>9</Text></TouchableRipple>
      <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('0')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>0</Text></TouchableRipple>
      {settings?.showExtraInNumbersRow && Platform.OS === 'ios' && !Platform.isPad && (
        mode === 'callsign' ? (
          <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('/')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>/</Text></TouchableRipple>
        ) : (
          <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('.')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>.</Text></TouchableRipple>
        )
      )}
      {settings?.showExtraInNumbersRow && Platform.OS === 'ios' && Platform.isPad && (
        <TouchableRipple style={styles.keyTouchable} disabled={!enabled} onPress={() => onNumberKeyPressed && onNumberKeyPressed('/')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>/</Text></TouchableRipple>
      )}
    </View>
  )
}
