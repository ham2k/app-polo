/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Platform, View } from 'react-native'
import { IconButton, Searchbar } from 'react-native-paper'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useNavigation } from '@react-navigation/native'
import { useTranslation } from 'react-i18next'

import { NumberKeys } from '../../OperationScreens/OpLoggingTab/components/LoggingPanel/NumberKeys'
import { useUIState } from '../../../store/ui/useUIState'
import { useKeyboardVisible } from '../../components/useKeyboardVisible'
import { selectRuntimeOnline } from '../../../store/runtime'
import { checkAndDescribeCommands, checkAndProcessCommands } from '../../../extensions/commands/commandHandling'

import { trackEvent } from '../../../distro'

import CallLookup from './CallLookup'
import Notices from './Notices'
import SyncProgress from './SyncProgress'

let commandInfoTimeout

export default function HomeTools ({ settings, styles, style }) {
  const { t, i18n } = useTranslation()
  const navigation = useNavigation()

  const dispatch = useDispatch()
  const online = useSelector(selectRuntimeOnline)

  const actualInnerRef = useRef()

  const [search, setSearch] = useState('')
  const [localValue, setLocalValue] = useState()
  useEffect(() => { setLocalValue(search) }, [search])

  const [commandInfo, actualSetCommandInfo] = useState()
  const setCommandInfo = useCallback((info) => {
    if (commandInfoTimeout) {
      clearTimeout(commandInfoTimeout)
    }
    if (info?.timeout) {
      commandInfoTimeout = setTimeout(() => {
        actualSetCommandInfo(undefined)
      }, info.timeout)
    }
    actualSetCommandInfo(info)
  }, [actualSetCommandInfo])

  const handleChangeText = useCallback((value) => {
    actualInnerRef.current?.setNativeProps({ text: value.toUpperCase() })
    if (Platform.OS === 'android') {
      // This minimizes issues when using external keyboards on Android
      setTimeout(() => setSearch(value.toUpperCase()), 15)
    } else {
      setSearch(value.toUpperCase())
    }
  }, [])

  useEffect(() => {
    if (search?.length > 2) {
      const { description } = checkAndDescribeCommands(search, { dispatch, settings, t, i18n, online, setCommandInfo })
      setCommandInfo({ message: description || undefined, match: !!description || description === '' })
    }
  }, [dispatch, online, search, setCommandInfo, settings, t, i18n, settings.operatorCall])

  const handleClearSearch = useCallback(() => {
    setSearch('')
  }, [])

  const navigateToCall = useCallback((call) => {
    navigation.navigate('CallInfo', { call })
  }, [navigation])

  const { isKeyboardVisible, keyboardExtraStyles } = useKeyboardVisible()

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

  const handleSubmit = useCallback((event) => {
    const commandResult = checkAndProcessCommands(search, { dispatch, settings, t, i18n, online, setCommandInfo, updateQSO: () => setSearch('') })
    if (commandResult) {
      trackEvent('command', { command: search })
      setCommandInfo({ message: commandResult || undefined, match: undefined, timeout: 3000 })
    }
  }, [search, dispatch, settings, t, i18n, online, setCommandInfo])

  return (
    <>
      <CallLookup
        call={search}
        commandInfo={commandInfo}
        settings={settings}
        styles={styles}
        style={{ backgroundColor: styles.colors.primaryContainer, marginTop: styles.oneSpace, borderTopWidth: 1, borderTopColor: styles.colors.primary }}
        onPress={navigateToCall}
      />

      <SafeAreaView
        edges={[isKeyboardVisible ? '' : 'bottom', 'left', 'right'].filter(x => x)}
        style={{ flex: 0, flexDirection: 'column', width: '100%', backgroundColor: styles.colors.primary }}
      >
        <View
          style={{ flexDirection: 'row', margin: styles.oneSpace, ...keyboardExtraStyles }}
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
              onSelectionChange: handleSelectionChange,
              onSubmitEditing: handleSubmit
            }}
            ref={actualInnerRef}
            placeholder={t('screens.home.quickCallLookupPlaceholder', 'Quick Call Lookup…')}
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
            accessibilityLabel={t('screens.home.spots-a11y', 'screens.home.spots', 'Spots')}
            size={styles.oneSpace * 3.5}
            style={{ flex: 0 }}
            onPress={() => navigation.navigate('Spots')}
          />

        </View>

        <SyncProgress />

        <Notices paddingForSafeArea={false} />

        {isKeyboardVisible && settings.showNumbersRow && (
          <NumberKeys settings={settings} themeColor={'primary'} onNumberKeyPressed={handleNumberKey} enabled={!!isFocused} />
        )}
      </SafeAreaView>
    </>
  )
}
