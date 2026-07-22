// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useCallback, useEffect, useMemo, useState } from 'react'

import { View } from 'react-native'
import { AnimatedFAB, Icon, Text } from 'react-native-paper'
import { useDispatch } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { useThemedStyles } from '../../styles/tools/useThemedStyles'
import ScreenContainer from '../components/ScreenContainer'
import { addNewOperation, selectOperationIdsByArchived } from '../../store/operations'
import { selectSettings } from '../../store/settings'
import OperationItem from './components/OperationItem'
import HomeTools from './components/HomeTools'
import { trackEvent } from '../../distro'
import { FlashList } from '@shopify/flash-list'
import { useIsFocused } from '@react-navigation/native'
import { useSelectorConditionally } from '../components/useConditionally'
import { H2kPressable } from '../../ui'

export default function HomeScreen ({ navigation }) {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const safeArea = useSafeAreaInsets()

  const styles = useThemedStyles(prepareStyles, { safeArea })

  const isFocused = useIsFocused()
  const [showArchive, setShowArchive] = useState(false)
  const operationIds = useSelectorConditionally(isFocused, (state) => selectOperationIdsByArchived(state, showArchive))
  const archivedOperationIds = useSelectorConditionally(isFocused, (state) => selectOperationIdsByArchived(state, true))
  const settings = useSelectorConditionally(isFocused, selectSettings)

  useEffect(() => {
    if (!settings?.operatorCall) {
      setTimeout(() => {
        navigation.navigate('Settings')
      }, 500)
    }
  }, [settings, navigation])

  useEffect(() => {
    navigation.setOptions({ rightAction: 'cog', rightA11yLabel: t('screens.home.settings-a11y', 'screens.home.settings', 'Settings'), onRightActionPress: () => navigation.navigate('Settings'), leftAction: 'logo' })
  }, [navigation, t])

  const handleNewOperation = useCallback(async () => {
    const operation = await dispatch(addNewOperation({ _useTemplates: true }))
    trackEvent('operation_created')
    navigation.navigate('Operation', { uuid: operation.uuid, operation, _isNew: true })
  }, [dispatch, navigation])

  const navigateToOperation = useCallback((operation) => {
    navigation.navigate('Operation', { uuid: operation.uuid, operation })
  }, [navigation])

  const navigateToArchive = useCallback(() => {
    setShowArchive(true)
  }, [])

  const navigateOutOfArchive = useCallback(() => {
    setShowArchive(false)
  }, [])

  const renderRow = useCallback(({ item }) => {
    if (item === '__archive__') {
      return (
        <ArchiveItem
          count={archivedOperationIds?.length ?? 0}
          styles={styles}
          style={{ paddingLeft: safeArea.left, paddingRight: safeArea.right }}
          onPress={navigateToArchive}
        />
      )
    }

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
  }, [archivedOperationIds?.length, navigateToArchive, navigateToOperation, styles, settings, safeArea])

  const listData = useMemo(() => {
    if (showArchive) return operationIds
    return [...(operationIds || []), '__archive__']
  }, [operationIds, showArchive])

  const [isExtended, setIsExtended] = React.useState(true)

  const handleScroll = useCallback(({ nativeEvent }) => {
    const currentScrollPosition = Math.floor(nativeEvent?.contentOffset?.y) ?? 0

    setIsExtended(currentScrollPosition <= styles.oneSpace * 8)
  }, [styles.oneSpace])

  const emptyListComponent = useMemo(() => <EmptyListComponent styles={styles} />, [styles])

  return (
    <ScreenContainer>
      <View style={styles.root}>
        <FlashList
          accesibilityLabel={t('screens.home.operationList-a11y', 'screens.home.operationList', 'Operation List')}
          style={styles.list}
          data={listData}
          renderItem={renderRow}
          ListHeaderComponent={showArchive ? <ArchiveHeader styles={styles} onBack={navigateOutOfArchive} /> : null}
          ListEmptyComponent={emptyListComponent}
          keyboardShouldPersistTaps={'handled'}
          onScroll={handleScroll}
        />
        {!showArchive && (
          <AnimatedFAB
            icon="plus"
            label={t('screens.home.newOperation', 'New Operation')}
            accessibilityLabel={t('screens.home.newOperation-a11y', 'screens.home.newOperation', 'New Operation')}
            mode="elevated"
            extended={isExtended}
            style={styles.fab}
            onPress={handleNewOperation}
          />
        )}
      </View>

      <HomeTools settings={settings} styles={styles} />
    </ScreenContainer>
  )
}

function ArchiveItem ({ count, styles, style, onPress }) {
  const { t } = useTranslation()
  const archiveLabel = t('screens.home.archiveFolder', 'Archive').toUpperCase()
  const rowStyle = {
    ...styles.row,
    paddingHorizontal: 0,
    paddingLeft: Math.max(styles?.row?.paddingHorizontal, style?.paddingLeft ?? 0),
    paddingRight: Math.max(styles.row.paddingHorizontal, style?.paddingRight ?? 0)
  }

  return (
    <H2kPressable
      onPress={onPress}
      accessibilityLabel={t('screens.home.archiveFolder-a11y', 'Archive')}
      style={styles.rowRoot}
    >
      <View style={rowStyle}>
        <View style={styles.rowTop}>
          <View style={[styles.rowTopLeft, styles.archiveLabelRow]}>
            <Text style={[styles.rowText, { fontWeight: 'bold' }]}>{archiveLabel}</Text>
            <Icon source="archive-outline" size={styles.normalFontSize * 1.3} />
          </View>
          <View style={styles.rowTopRight}>
            <View style={styles.countContainer}>
              <Text style={styles.countText}>{count}</Text>
            </View>
          </View>
        </View>
      </View>
    </H2kPressable>
  )
}

function ArchiveHeader ({ styles, onBack }) {
  const { t } = useTranslation()
  const archiveLabel = t('screens.home.archiveFolder', 'Archive').toUpperCase()

  return (
    <H2kPressable onPress={onBack} accessibilityLabel={t('screens.home.archiveBack-a11y', 'Back to operations')} style={styles.rowRoot}>
      <View style={[styles.row, { paddingHorizontal: styles.row.paddingHorizontal }]}>
        <View style={[styles.rowTop, { alignItems: 'center' }]}>
          <View style={[styles.rowTopLeft, styles.archiveLabelRow]}>
            <Text style={styles.rowText}>{'←'}</Text>
            <Icon source="archive-outline" size={styles.normalFontSize * 1.3} />
            <Text style={[styles.rowText, { fontWeight: 'bold' }]}>{archiveLabel}</Text>
          </View>
        </View>
      </View>
    </H2kPressable>
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
      ...(baseStyles.isAndroid ? { position: 'absolute' } : {}),
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
    archiveLabelRow: {
      flexDirection: 'row',
      alignItems: 'center',
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
