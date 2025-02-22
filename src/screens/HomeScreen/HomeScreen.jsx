/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect } from 'react'

import { FlatList, View } from 'react-native'
import { AnimatedFAB, Text } from 'react-native-paper'
import { useDispatch, useSelector } from 'react-redux'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { addNewOperation, selectOperationsList } from '../../store/operations'
import { selectRawSettings, selectSettings } from '../../store/settings'
import Notices from './components/Notices'
import OperationItem from './components/OperationItem'
import HomeTools from './components/HomeTools'
import { trackEvent, trackSettings } from '../../distro'
import { selectRuntimeOnline } from '../../store/runtime'

function prepareStyles (baseStyles) {
  const DEBUG = false

  return {
    ...baseStyles,
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
      lineHeight: baseStyles.smallFontSize * 1.3
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
      lineHeight: baseStyles.smallFontSize * 1.3,
      fontWeight: 'bold'
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

export default function HomeScreen ({ navigation }) {
  const styles = useThemedStyles(prepareStyles)
  const dispatch = useDispatch()
  const operations = useSelector(selectOperationsList)
  const settings = useSelector(selectSettings)
  const rawSettings = useSelector(selectRawSettings)
  const online = useSelector(selectRuntimeOnline)

  const safeArea = useSafeAreaInsets()

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
    navigation.setOptions({ rightAction: 'cog', rightA11yLabel: 'Settings', onRightActionPress: () => navigation.navigate('Settings') })
  }, [navigation])

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
      <OperationItem key={item.uuid} operation={item} settings={settings} styles={styles} onPress={navigateToOperation} />
    )
  }, [navigateToOperation, styles, settings])

  const [isExtended, setIsExtended] = React.useState(true)

  const handleScroll = useCallback(({ nativeEvent }) => {
    const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0

    setIsExtended(currentScrollPosition <= styles.oneSpace * 8)
  }, [styles.oneSpace])

  return (
    <ScreenContainer>
      <View style={{ flex: 1, width: '100%', padding: 0, margin: 0 }}>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <FlatList
            accesibilityLabel="Operation List"
            style={{ flex: 1 }}
            data={operations}
            renderItem={renderRow}
            ListEmptyComponent={
              <Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>No Operations!</Text>
            }
            keyboardShouldPersistTaps={'handled'}
            onScroll={handleScroll}
          />
        </GestureHandlerRootView>
        <AnimatedFAB
          icon="plus"
          label="New Operation"
          accessibilityLabel="New Operation"
          extended={isExtended}
          style={[{
            right: Math.max(styles.oneSpace * 2, safeArea.right),
            bottom: Math.max(styles.oneSpace * 2, safeArea.bottom)
          }]}
          onPress={handleNewOperation}
        />
      </View>

      <HomeTools settings={settings} styles={styles} />

      <Notices />
    </ScreenContainer>
  )
}
