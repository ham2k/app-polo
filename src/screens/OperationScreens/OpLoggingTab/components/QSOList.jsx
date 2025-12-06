/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { PixelRatio, SectionList, View } from 'react-native'
import { Text } from 'react-native-paper'
import { useSafeAreaFrame, useSafeAreaInsets } from 'react-native-safe-area-context'
import getItemLayout from 'react-native-get-item-layout-section-list'
import { useTranslation } from 'react-i18next'

import { useThemedStyles } from '../../../../styles/tools/useThemedStyles'
import { findHooks } from '../../../../extensions/registry'
import { fmtFreqInMHz } from '../../../../tools/frequencyFormats'
import { fmtShortTimeZulu, fmtTimeZulu } from '../../../../tools/timeFormats'

import QSOItem from './entries/QSOItem'
import QSOHeader from './entries/QSOHeader'
import EventItem from './entries/EventItem'
import EventNoteItem from './entries/EventNoteItem'
import EventSegmentItem from './entries/EventSegmentItem'

let scrollTimeout

const QSOList = React.memo(function QSOList ({ style, ourInfo, settings, qsos, sections, operation, vfo, onHeaderPress, lastUUID, selectedUUID, onSelectQSO }) {
  const { t } = useTranslation()

  const { width } = useSafeAreaFrame()
  // const { width } = useWindowDimensions() <-- broken on iOS, no rotation
  const safeAreaInsets = useSafeAreaInsets()

  const [componentWidth, setComponentWidth] = useState()
  const handleLayout = useCallback((event) => {
    setComponentWidth(event?.nativeEvent?.layout?.width)
  }, [setComponentWidth])

  const { hasFrequencyDecimals, hasLongCall } = useMemo(() => {
    const _hasDecimals = qsos.find(qso => (qso?.freq || 0) % 1 !== 0)
    const _hasLongCall = qsos.find(qso => qso?.their?.call?.length > 6)
    return {
      hasFrequencyDecimals: _hasDecimals,
      hasLongCall: _hasLongCall
    }
  }, [qsos])

  const styles = useThemedStyles(
    _prepareStyles,
    { componentWidth: componentWidth ?? width, safeArea: safeAreaInsets, hasFrequencyDecimals, hasLongCall }
  )

  const listRef = useRef()

  // console.log('QSOList render')
  // useEffect(() => console.log('-- QSOList sections', sections), [sections])
  // useEffect(() => console.log('-- QSOList lastUUID', lastUUID), [lastUUID])
  // useEffect(() => console.log('-- QSOList selectedUUID', selectedUUID), [selectedUUID])
  // useEffect(() => console.log('-- QSOList styles', styles), [styles])
  // useEffect(() => console.log('-- QSOList stylesForDeleted', stylesForDeleted), [stylesForDeleted])
  // useEffect(() => console.log('-- QSOList stylesForOtherOperator', stylesForOtherOperator), [stylesForOtherOperator])
  // useEffect(() => console.log('-- QSOList listRef', listRef), [listRef])

  // When the list is first displayed, we want to jump to the bottom.
  // When there's a new `lastUUID`, we also jump to it.
  // And if there's a `selectedUUID`, we want to make sure it is visible.
  // But when selection changes to "nothing", or to a uuid that cannot be found (new QSO),
  // then we DO NOT want to jump back to the last QSO.
  const jumpDataRef = useRef({ jumpedToLast: -1 })

  // When the lastQSO changes, scroll to it
  useEffect(() => {
    // console.log('useEffect scroll to', { lastUUID, jumpedToLast: jumpDataRef?.current?.jumpedToLast, sections: sections?.length })
    if (!sections || !sections.length) return

    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }

    const targetUUID = selectedUUID || lastUUID

    let sectionIndex = sections.length - 1
    let itemIndex = sections[sectionIndex].data.length - 1

    if (targetUUID && targetUUID !== jumpDataRef.current.jumpedToLast) {
      // eslint-disable-next-line no-unused-vars
      const found = sections.find((section, i) => {
        return section.data.find((qso, j) => {
          if (qso.uuid === targetUUID) {
            sectionIndex = i
            itemIndex = j
            return true
          }
          return false
        })
      })
      // TODO: Figure out how to only scroll when opening the operation,
      // or when logging a new QSO, but not when just changing the selected QSO

      // if (!found) {
      //   return
      // }
    }
    // console.log('scroll to?', { targetUUID, jumpedToLast: jumpDataRef.current.jumpedToLast })

    if (targetUUID !== jumpDataRef.current.jumpedToLast) {
      scrollTimeout = setTimeout(() => {
        // console.log('scrolling to')
        try {
          listRef.current?.scrollToLocation({ sectionIndex, itemIndex, animated: true })
        } catch (e) {
          // Sometimes the QSO list can change before this timeout call is executed
          console.error('Error scrolling to last QSO', e)
        }
      }, 50)
    }

    if (targetUUID === lastUUID) {
      jumpDataRef.current.jumpedToLast = lastUUID
    }
    return () => {
      if (scrollTimeout) {
        clearTimeout(scrollTimeout)
      }
    }
  }, [listRef, lastUUID, selectedUUID, sections])
  // console.log('QSOList last UUID', lastUUID)
  const refHandlers = useMemo(() => {
    const types = {}
    ;(operation?.refs || []).forEach((ref) => {
      types[ref.type] = true
    })
    qsos.forEach((qso) => {
      (qso.refs || []).forEach((ref) => {
        types[ref.type] = true
      })
    })
    let handlers = []
    Object.keys(types).forEach(key => {
      handlers = handlers.concat(findHooks(`ref:${key}`).filter(h => h.relevantInfoForQSOItem))
    })
    return handlers.filter(x => x)
  }, [qsos, operation])

  const handlePress = useCallback(({ qso }) => {
    if (qso.uuid === selectedUUID) {
      onSelectQSO(undefined)
    } else {
      onSelectQSO(qso.uuid)
    }
  }, [selectedUUID, onSelectQSO])

  const timeFormatFunction = useMemo(() => {
    if (styles.sized({ m: true })) {
      return fmtTimeZulu
    } else {
      return fmtShortTimeZulu
    }
  }, [styles])

  const renderRow = useCallback(({ item, index }) => {
    const qso = item

    const isOtherOperator = (qso.our?.operatorCall && qso.our?.operatorCall !== operation?.local?.operatorCall)

    let Component = QSOItem
    if (qso.band === 'event') {
      if (qso.event?.event === 'start' || qso.event?.event === 'end' || qso.event?.event === 'break') {
        Component = EventSegmentItem
      } else if (qso.event?.event === 'note') {
        Component = EventNoteItem
      } else if (qso.event?.event === 'todo') {
        Component = EventNoteItem
      } else {
        Component = EventItem
      }
    }

    return (
      <Component
        qso={qso}
        settings={settings}
        selected={qso.uuid === selectedUUID}
        ourInfo={ourInfo}
        onPress={handlePress}
        timeFormatFunction={timeFormatFunction}
        styles={styles}
        isOtherOperator={isOtherOperator}
        refHandlers={refHandlers}
      />
    )
  }, [operation, settings, selectedUUID, ourInfo, handlePress, timeFormatFunction, refHandlers, styles])

  const renderHeader = useCallback(({ section, index }) => {
    return (
      <QSOHeader
        section={section}
        operation={operation}
        settings={settings}
        styles={styles}
        onHeaderPress={onHeaderPress}
      />
    )
  }, [operation, settings, styles, onHeaderPress])

  // eslint-disable-next-line react-hooks/exhaustive-deps -- useCallback prefers to see an inline function
  const calculateLayout = useCallback(
    getItemLayout({
      getItemHeight: styles.row.height + styles.row.borderBottomWidth,
      getSectionHeaderHeight: styles.headerRow.height + styles.headerRow.borderBottomWidth
    }),
    [styles]
  )

  const extractKey = useCallback((item, index) => item.uuid, [])
  const emptyComponent = useCallback(() => (
    <ListEmptyComponent styles={styles} vfo={vfo} t={t} />
  ), [styles, vfo, t])

  return (
    <SectionList
      style={style}
      ref={listRef}
      onLayout={handleLayout}
      sections={sections || []}
      renderItem={renderRow}
      renderSectionHeader={renderHeader}
      getItemLayout={calculateLayout}
      keyExtractor={extractKey}
      ListEmptyComponent={emptyComponent}
      keyboardShouldPersistTaps={'handled'} // Otherwise android closes the keyboard inbetween fields
      initialNumToRender={20}
      windowSize={2}
      maxToRenderPerBatch={30}
      updateCellsBatchingPeriod={100}
      stickySectionHeadersEnabled={true}
      removeClippedSubviews={false} // Buggy on Android
    />
  )
})

const ListEmptyComponent = React.memo(function ListEmptyComponent ({ styles, vfo, t }) {
  return (
    <View style={{ flexDirection: 'column' }}>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>
        {t('screens.opLoggingTab.noQSOsYet', 'No QSOs yet!')}
      </Text>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>
        {t('screens.opLoggingTab.currentlySetTo', 'Currently set to')}
      </Text>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 1, textAlign: 'center', fontWeight: 'bold' }}>
        {[vfo.freq ? fmtFreqInMHz(vfo.freq) + ' MHz' : vfo.band, vfo.mode].filter(x => x).join(' • ')}
      </Text>
    </View>
  )
})

function _prepareStyles (themeStyles, { componentWidth: width, safeArea, hasFrequencyDecimals, hasLongCall }) {
  const { oneSpace, sized, normalFontSize, colors, isIOS, isDarkMode } = themeStyles

  // console.log('width', { width, spaces, size })
  const DEBUG = false

  const spaces = width / oneSpace

  const commonStyles = {
    fontSize: normalFontSize,
    lineHeight: normalFontSize * (isIOS ? 1.5 : 1.4),
    borderWidth: DEBUG ? 1 : 0,
    color: colors.onBackground
  }

  const heightFactor = sized({ xs: 3.5, sm: 4, md: 4.4 })
  const paddingTopFactor = sized({ xs: 0.1, sm: 0.4, md: 0.6 })

  const rowStyles = {
    height: PixelRatio.roundToNearestPixel(oneSpace * heightFactor),
    maxHeight: PixelRatio.roundToNearestPixel(oneSpace * heightFactor),
    minHeight: PixelRatio.roundToNearestPixel(oneSpace * heightFactor),
    paddingHorizontal: oneSpace,
    paddingTop: PixelRatio.roundToNearestPixel(oneSpace * paddingTopFactor),
    borderBottomWidth: PixelRatio.roundToNearestPixel(1),
    borderBottomColor: colors.outlineVariant,
    paddingLeft: safeArea?.left || 0,
    flexDirection: 'row',
    width: '100%'
  }

  const styles = {
    ...themeStyles,
    spaces,
    hasFrequencyDecimals,
    hasLongCall,

    row: {
      ...rowStyles
    },
    rowInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      width: '100%'
    },
    selectedRow: {
      backgroundColor: colors.secondaryContainer,
      borderTopWidth: 3,
      borderBottomWidth: 3,
      borderTopColor: colors.secondary,
      borderBottomColor: colors.secondary,
      paddingTop: 1,
      marginTop: PixelRatio.roundToNearestPixel(oneSpace * -0.1),
      marginBottom: PixelRatio.roundToNearestPixel(oneSpace * 0.1)
    },
    headerRow: {
      ...rowStyles,
      backgroundColor: colors.surfaceVariant,
      borderTopWidth: 0,
      borderBottomWidth: 2,
      borderTopColor: colors.onBackgroundLight,
      borderBottomColor: colors.onBackgroundLight
    },
    eventRow: {
      backgroundColor: 'rgb(252, 244, 167)',
      opacity: isDarkMode ? 0.65 : 0.85
      // borderTopColor: 'rgb(97, 92, 47)',
      // borderTopWidth: 1
    },
    segmentRow: {
      backgroundColor: colors.primaryLighter,
      borderBottomWidth: 0
      // borderTopWidth: 3,
      // borderColor: colors.primary,
      // paddingTop: 1,
      // marginTop: 0
    },

    eventContent: {
      color: 'rgb(21, 20, 10)'
    },
    segmentContent: {
      color: colors.onPrimary
    },
    deletedContent: {
      textDecorationLine: 'line-through',
      textDecorationColor: colors.onBackground,
      color: colors.onBackgroundLighter
    },
    otherOperatorContent: {
      opacity: 0.7
    },

    fields: {
      header: {
        ...commonStyles,
        fontFamily: themeStyles.fontFamily,
        flex: 0,
        marginLeft: oneSpace,
        textAlign: 'left'
      },
      event: {
        ...commonStyles,
        lineHeight: normalFontSize * (isIOS ? 1.5 : 1.4),
        marginLeft: oneSpace * sized({ xs: 1, lg: 2 }),
        minWidth: PixelRatio.roundToNearestPixel(oneSpace * 3.5),
        textAlign: 'left',
        flex: 1
      },
      markdown: {
        lineHeight: normalFontSize * (isIOS ? 1.5 : 1.4)
      },
      number: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        flex: 0,
        marginLeft: 0,
        minWidth: oneSpace * sized({ xs: 3, md: 4 }),
        textAlign: 'right'
      },
      time: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        minWidth: oneSpace * sized({ xs: 7, lg: 10 }),
        marginLeft: oneSpace,
        textAlign: 'right'
      },
      freq: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        // fontFamily: 'Roboto',
        flex: 0,
        minWidth: PixelRatio.roundToNearestPixel(oneSpace * sized({
          xs: hasFrequencyDecimals ? 7 : 6,
          sm: hasFrequencyDecimals ? 8.5 : 7.5,
          md: hasFrequencyDecimals ? 10 : 8,
          lg: hasFrequencyDecimals ? 10 : 8
        })),
        marginLeft: oneSpace * sized({ xs: 1, lg: 2 }),
        marginTop: PixelRatio.roundToNearestPixel(oneSpace * 0.1),
        textAlign: 'right'
      },
      freqMHz: {
        ...commonStyles,
        fontWeight: '600',
        textAlign: 'right'
      },
      freqKHz: {
        ...commonStyles,
        textAlign: 'right'
      },
      freqHz: {
        ...commonStyles,
        textAlign: 'right',
        fontWeight: '400',
        fontSize: normalFontSize * 0.7
      },
      call: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        ...themeStyles.text.callsignBold,
        flex: 0,
        minWidth: oneSpace * sized({
          xs: hasLongCall ? 8 : 7,
          sm: hasLongCall ? 9 : 8,
          md: 10
        }),
        marginLeft: oneSpace * sized({ xs: 1, lg: 2 }),
        textAlign: 'left'
      },
      name: {
        ...commonStyles,
        flex: 1,
        marginLeft: oneSpace * sized({ xs: 1, lg: 2 }),
        textAlign: 'left'
      },
      location: {
        ...commonStyles,
        flex: 0,
        marginLeft: oneSpace * sized({ xs: 1, lg: 2 }),
        minWidth: oneSpace * sized({ xs: 4, md: 6 }),
        textAlign: 'center'
      },
      signal: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        minWidth: oneSpace * sized({ xs: 3, md: 9 }),
        marginLeft: oneSpace,
        textAlign: 'right'
      },
      exchange: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        flex: 0,
        minWidth: PixelRatio.roundToNearestPixel(oneSpace * 8.5),
        marginLeft: oneSpace,
        textAlign: 'right'
      },
      icons: {
        ...commonStyles,
        fontSize: normalFontSize * 0.8,
        flex: 0,
        flexDirection: 'row',
        textAlign: 'right',
        marginLeft: oneSpace * sized({ xs: 1, lg: 2 }),
        minWidth: oneSpace * 0,
        maxWidth: oneSpace * 9
      },
      icon: {
        ...commonStyles,
        flex: 0,
        marginTop: PixelRatio.roundToNearestPixel(oneSpace * 0.45),
        width: PixelRatio.roundToNearestPixel(oneSpace * 1.8)
      }
    }
  }

  styles.deletedFields = {}
  styles.otherOperatorFields = {}
  for (const field in styles.fields) {
    styles.deletedFields[field] = {
      ...styles.fields[field],
      ...styles.deletedContent
    }

    styles.otherOperatorFields[field] = {
      ...styles.fields[field],
      ...styles.otherOperatorContent
    }
  }

  return styles
}

export default QSOList
