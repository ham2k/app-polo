/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { Text, View, Vibration } from 'react-native'

import { useUIState } from '../../../../../store/ui/useUIState'
import { useThemedStyles } from '../../../../../styles/tools/useThemedStyles'
import { H2kPressable } from '../../../../../ui'

function prepareStyles (baseStyles, themeColor) {
  const upcasedThemeColor = themeColor.charAt(0).toUpperCase() + themeColor.slice(1)
  let vertPaddingMult = 0.5
  if (baseStyles.mdOrLarger) vertPaddingMult = 2
  else if (baseStyles.smOrLarger) vertPaddingMult = 1

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
      // borderWidth: 1,
      // borderColor: 'red',
      // borderRadius: baseStyles.oneSpace * 1.5,
      // overflow: 'hidden', // or round borders never show
      paddingVertical: baseStyles.oneSpace * vertPaddingMult
    },
    disabledRoot: {
      backgroundColor: baseStyles.theme.colors[`${themeColor}Container`]
    },
    enabledKey: {
      color: baseStyles.theme.colors[`on${upcasedThemeColor}Light`]
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

  const handleKey = useCallback((key) => {
    if (settings.vibrateNumbersRow !== false) Vibration.vibrate(1)

    onNumberKeyPressed && onNumberKeyPressed(key)
  }, [onNumberKeyPressed, settings.vibrateNumbersRow])

  return (
    <View style={[styles.root, enabled ? styles.enabledRoot : styles.disabledRoot]}>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('1')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>1</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('2')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>2</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('3')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>3</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('4')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>4</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('5')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>5</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('6')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>6</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('7')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>7</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('8')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>8</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('9')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>9</Text></H2kPressable>
      <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('0')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>0</Text></H2kPressable>
      {settings?.showCommaInNumbersRow && (
        <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey(',')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>,</Text></H2kPressable>
      )}
      {settings?.showExtraInNumbersRow && mode === 'callsign' && (
        <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('/')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>/</Text></H2kPressable>
      )}
      {settings?.showExtraInNumbersRow && mode === 'numbers' && (
        <H2kPressable style={styles.keyTouchable} disabled={!enabled} onPress={() => handleKey('.')}><Text style={[styles.key, enabled ? styles.enabledKey : styles.disabledKey]}>.</Text></H2kPressable>
      )}
    </View>
  )
}
