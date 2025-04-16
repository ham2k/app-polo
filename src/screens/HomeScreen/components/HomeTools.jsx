/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { Keyboard, Platform, View } from 'react-native'
import { IconButton, Searchbar } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'

import { NumberKeys } from '../../OperationScreens/OpLoggingTab/components/LoggingPanel/NumberKeys'
import { useUIState } from '../../../store/ui/useUIState'

import CallLookup from './CallLookup'
import { trackEvent } from '../../../distro'
import { parseCallsign } from '@ham2k/lib-callsigns'
import { annotateFromCountryFile } from '@ham2k/lib-country-files'
import Notices from './Notices'

export default function HomeTools ({ settings, styles, style }) {
  const navigation = useNavigation()

  const actualInnerRef = useRef()

  const [search, setSearch] = useState('')
  const [localValue, setLocalValue] = useState()
  useEffect(() => { setLocalValue(search) }, [search])

  const handleChangeText = useCallback((value) => {
    actualInnerRef.current.setNativeProps({ text: value.toUpperCase() })
    if (Platform.OS === 'android') {
      // This minimizes issues when using external keyboards on Android
      setTimeout(() => setSearch(value.toUpperCase()), 15)
    } else {
      setSearch(value.toUpperCase())
    }
  }, [])

  useEffect(() => {
    const timeout = setTimeout(() => {
      let theirInfo = parseCallsign(search)
      if (theirInfo.baseCall) {
        theirInfo = annotateFromCountryFile(theirInfo)
      }
      if (theirInfo.entityPrefix) {
        trackEvent('search_callsign', { their_prefix: theirInfo.entityPrefix })
      }
    }, 2000)

    return () => clearTimeout(timeout)
  }, [search, settings?.operatorCall])

  const handleClearSearch = useCallback(() => {
    setSearch('')
  }, [])

  const navigateToCall = useCallback((call) => {
    navigation.navigate('CallInfo', { call })
  }, [navigation])

  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [keyboardExtraStyles, setKeyboardExtraStyles] = useState({})
  useEffect(() => {
    if (Keyboard.isVisible()) {
      const metrics = Keyboard.metrics()
      if (metrics.height > 100) {
        setIsKeyboardVisible(true)
        setKeyboardExtraStyles({})
      } else {
        setIsKeyboardVisible(false)
        setKeyboardExtraStyles({ paddingBottom: metrics.height - 10 })
      }
    }

    const didShowSubscription = Keyboard.addListener('keyboardDidShow', () => {
      const metrics = Keyboard.metrics()
      if (metrics.height > 100) {
        // On iPads, when there's an external keyboard connected, the OS still shows a small
        // button on the bottom right with some options
        // This is considered "keyboard visible", which causes KeyboardAvoidingView to leave an ugly empty padding
        setIsKeyboardVisible(true)
        setKeyboardExtraStyles({})
      } else {
        setIsKeyboardVisible(false)
        setKeyboardExtraStyles({ paddingBottom: metrics.height - 10 })
      }
    })
    const didHideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false)
      setKeyboardExtraStyles({})
    })

    return () => {
      didShowSubscription.remove()
      didHideSubscription.remove()
    }
  }, [])

  const [currentSelection, setCurrentSelection] = useState({})
  const [isFocused, setIsFocused] = useState(false)

  const [, setNumberKeysMode] = useUIState('NumberKeys', 'mode', 'numbers')
  useEffect(() => {
    setNumberKeysMode('callsign')
  }, [setNumberKeysMode])

  const handleNumberKey = useCallback((number) => {
    if (!isFocused) return

    let { start, end } = currentSelection

    if (!start && !end) {
      // If selection position is unknown, we assume the cursor is at the end of the string
      start = search.length
      end = search.length
    }

    setSearch(search.substring(0, start) + number + search.substring(end))

    if (search.length === start && search.length === end) {
      // Cursor was at the end of the original value
      // Since the handleChange method might modify the value, and does not cause
      // a call to onSelectionChange, we need to mark the current selection state as 'unknown'
      setCurrentSelection({})
    } else {
      setCurrentSelection({ start: start + 1, end: end + 1 })
    }
  }, [currentSelection, isFocused, search, setSearch])

  const handleSelectionChange = useCallback((event) => {
    const { nativeEvent: { selection: { start, end } } } = event

    setCurrentSelection({ start, end })
  }, [])

  const handleFocus = useCallback((event) => {
    setIsFocused(true)
  }, [])

  const handleBlur = useCallback((event) => {
    setIsFocused(false)
  }, [])

  return (
    <>
      <CallLookup
        call={search}
        settings={settings}
        styles={styles}
        style={{ backgroundColor: styles.colors.primaryContainer, borderTopWidth: 1, borderTopColor: styles.colors.primary }}
        onPress={navigateToCall}
      />

      <SafeAreaView
        edges={[isKeyboardVisible ? '' : 'bottom', 'left', 'right'].filter(x => x)}
        style={{ flex: 0, flexDirection: 'column', width: '100%', backgroundColor: styles.colors.primary }}
      >
        <Notices />

        <View
          style={{ flexDirection: 'row', padding: styles.oneSpace, margin: 0, paddingBottom: styles.oneSpace, ...keyboardExtraStyles }}
        >
          <Searchbar
            {...{
              autoComplete: 'off',
              autoCorrect: false,
              spellCheck: false,
              dataDetectorType: 'none',
              textContentType: 'none',
              inputMode: undefined,
              importantForAutofill: 'no',
              returnKeyType: 'send',
              autoCapitalize: 'characters',

              // On Android, "visible-password" would enable numbers in the keyboard, and disable autofill
              // but it has serious lag issues https://github.com/facebook/react-native/issues/35735
              // keyboardType: 'visible-password',
              // secureTextEntry: Platform.OS === 'android'
              // textContentType: Platform.OS === 'android' ? 'password' : 'none',

              onBlur: handleBlur,
              onFocus: handleFocus,
              onSelectionChange: handleSelectionChange
            }}
            ref={actualInnerRef}
            placeholder={'Quick Call Lookup…'}
            value={localValue}
            onChangeText={handleChangeText}
            traileringIcon={search ? 'close' : ''}
            onTraileringIconPress={handleClearSearch}
            theme={{ colors: { onSurface: styles.colors.onBackgroundLight } }}
            style={{ flex: 1 }}
          />

          <IconButton
            icon="format-list-bulleted"
            iconColor={styles.colors.onPrimary}
            accessibilityLabel={'Spots'}
            size={styles.oneSpace * 3.5}
            style={{ flex: 0 }}
            onPress={() => navigation.navigate('Spots')}
          />
        </View>
        {isKeyboardVisible && settings.showNumbersRow && (
          <NumberKeys settings={settings} themeColor={'primary'} onNumberKeyPressed={handleNumberKey} enabled={!!isFocused} />
        )}
      </SafeAreaView>
    </>
  )
}
