/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo } from 'react'

import { FlatList, View } from 'react-native'
import { AnimatedFAB, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { addNewOperation, selectOperationIds } from '../../store/operations'
import { selectRawSettings, selectSettings } from '../../store/settings'
import OperationItem from './components/OperationItem'
import HomeTools from './components/HomeTools'
import { trackEvent, trackSettings } from '../../distro'
import { selectRuntimeOnline } from '../../store/runtime'

export default function HomeScreen ({ navigation }) {
  const { t } = useTranslation()
  const safeArea = useSafeAreaInsets()
  const styles = useThemedStyles(prepareStyles, { safeArea })

  const dispatch = useDispatch()
  const operationIds = useSelector(selectOperationIds)
  const settings = useSelector(selectSettings)
  const rawSettings = useSelector(selectRawSettings)
  const online = useSelector(selectRuntimeOnline)

  useEffect(() => {
    if (!settings?.operatorCall) {
      setTimeout(() => {
        navigation.navigate('Settings')
      }, 500)
    }
  }, [settings, navigation])

  useEffect(() => {
    if (online) trackSettings({ settings: rawSettings })
    // We don't want to track changes in settings, so no dependencies here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    navigation.setOptions({ rightAction: 'cog', rightA11yLabel: t('screens.home.settings-a11y', 'screens.home.settings', 'Settings'), onRightActionPress: () => navigation.navigate('Settings'), leftAction: 'logo' })
  }, [navigation, t])

  const handleNewOperation = useCallback(async () => {
    const operation = await dispatch(addNewOperation({ _useTemplates: true }))
    trackEvent('create_operation')
    navigation.navigate('Operation', { uuid: operation.uuid, operation, _isNew: true })
  }, [dispatch, navigation])

  const navigateToOperation = useCallback((operation) => {
    navigation.navigate('Operation', { uuid: operation.uuid, operation })
  }, [navigation])

  const renderRow = useCallback(({ item }) => {
    return (
      <OperationItem
        key={item}
        operationId={item}
        settings={settings}
        styles={styles}
        style={{ paddingLeft: safeArea.left, paddingRight: safeArea.right }}
        onPress={navigateToOperation}
      />
    )
  }, [navigateToOperation, styles, settings, safeArea])

  const [isExtended, setIsExtended] = React.useState(true)

  const handleScroll = useCallback(({ nativeEvent }) => {
    const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0

    setIsExtended(currentScrollPosition <= styles.oneSpace * 8)
  }, [styles.oneSpace])

  const emptyListComponent = useMemo(() => <EmptyListComponent styles={styles} />, [styles])

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <GestureHandlerRootView style={styles.root}>
          <FlatList
            accesibilityLabel={t('screens.home.operationList-a11y', 'screens.home.operationList', 'Operation List')}
            style={styles.list}
            data={operationIds}
            renderItem={renderRow}
            ListEmptyComponent={emptyListComponent}
            keyboardShouldPersistTaps={'handled'}
            onScroll={handleScroll}
          />
          <AnimatedFAB
            icon="plus"
            label={t('screens.home.newOperation', 'New Operation')}
            accessibilityLabel={t('screens.home.newOperation-a11y', 'screens.home.newOperation', 'New Operation')}
            mode="elevated"
            extended={isExtended}
            style={styles.fab}
            onPress={handleNewOperation}
          />
        </GestureHandlerRootView>
      </View>

      <HomeTools settings={settings} styles={styles} />
    </ScreenContainer>
  )
}

const EmptyListComponent = ({ styles }) => {
  const { t } = useTranslation()

  return (
    <View style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>
      <Text style={{ textAlign: 'center' }}>{t('screens.home.noOperations', 'No Operations!')}</Text>
    </View>
  )
}

function prepareStyles (baseStyles, { safeArea }) {
  const DEBUG = false

  return {
    ...baseStyles,
    root: {
      flex: 1,
      width: '100%',
      padding: 0,
      margin: 0
    },
    list: {
      flex: 1
    },
    fab: {
      ...baseStyles.isAndroid ? { position: 'absolute' } : {},
      right: Math.max(baseStyles.oneSpace * 2, safeArea.right),
      bottom: Math.max(baseStyles.oneSpace * 2, safeArea.bottom)
    },
    row: {
      ...baseStyles.row,
      // borderWidth: 1,
      // borderColor: 'blue',
      flexDirection: 'column',
      justifyContent: 'space-between',
      gap: baseStyles.oneSpace,
      paddingTop: baseStyles.oneSpace * 1.5
    },
    rowTop: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: baseStyles.oneSpace
    },
    rowBottom: {
      width: '100%',
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: baseStyles.oneSpace
    },
    rowTopLeft: {
      borderWidth: DEBUG ? 1 : undefined,
      borderColor: DEBUG ? 'blue' : undefined,
      flex: 1
    },
    rowTopRight: {
      borderWidth: DEBUG ? 1 : undefined,
      borderColor: DEBUG ? 'blue' : undefined,
      flex: 0
    },
    rowBottomLeft: {
      borderWidth: DEBUG ? 1 : undefined,
      borderColor: DEBUG ? 'blue' : undefined,
      flex: 1
    },
    rowBottomRight: {
      borderWidth: DEBUG ? 1 : undefined,
      borderColor: DEBUG ? 'blue' : undefined,
      flex: 0
    },
    countContainer: {
      backgroundColor: 'rgba(127,127,127,0.4)',
      borderWidth: 0,
      paddingRight: baseStyles.oneSpace * 0.8,
      paddingLeft: baseStyles.oneSpace * 0.8,
      marginTop: -baseStyles.oneSpace * 0.1,
      borderRadius: baseStyles.oneSpace * 1.5
    },
    rowText: {
      ...baseStyles.rowText,
      backgroundColor: DEBUG ? 'rgba(0,0,0,0.1)' : undefined,
      fontSize: baseStyles.normalFontSize,
      fontWeight: '600',
      lineHeight: baseStyles.normalFontSize * 1.3
    },
    countText: {
      ...baseStyles.rowText,
      fontSize: baseStyles.smallFontSize,
      lineHeight: baseStyles.smallFontSize * 1.3
      // fontWeight: 'bold'
    },
    rowTextSmall: {
      ...baseStyles.rowText,
      backgroundColor: DEBUG ? 'rgba(0,0,0,0.1)' : undefined,
      fontSize: baseStyles.smallFontSize,
      lineHeight: baseStyles.smallFontSize * 1.3
    },
    rowTextSmallBold: {
      ...baseStyles.rowText,
      backgroundColor: DEBUG ? 'rgba(0,0,0,0.1)' : undefined,
      fontSize: baseStyles.smallFontSize,
      fontWeight: 'bold',
      lineHeight: baseStyles.smallFontSize * 1.3
    },
    markdown: {
      ...baseStyles.markdown,
      body: {
        ...baseStyles.markdown.body,
        ellipsizeMode: 'tail',
        numberOfLines: 1,
        backgroundColor: DEBUG ? 'rgba(0,0,0,0.1)' : undefined
      },
      paragraph: { margin: 0, padding: 0, marginTop: 0, marginBottom: 0 }
    }
  }
}
