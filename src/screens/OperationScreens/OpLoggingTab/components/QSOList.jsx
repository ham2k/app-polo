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
  const { width } = useSafeAreaFrame()
  // const { width } = useWindowDimensions() <-- broken on iOS, no rotation
  const safeAreaInsets = useSafeAreaInsets()

  const [componentWidth, setComponentWidth] = useState()
  const handleLayout = useCallback((event) => {
    setComponentWidth(event?.nativeEvent?.layout?.width)
  }, [setComponentWidth])

  const styles = useThemedStyles(_prepareStyles, { componentWidth: componentWidth ?? width, safeArea: safeAreaInsets })

  const listRef = useRef()

  // console.log('QSOList render')
  // useEffect(() => console.log('-- QSOList sections', sections), [sections])
  // useEffect(() => console.log('-- QSOList lastUUID', lastUUID), [lastUUID])
  // useEffect(() => console.log('-- QSOList selectedUUID', selectedUUID), [selectedUUID])
  // useEffect(() => console.log('-- QSOList styles', styles), [styles])
  // useEffect(() => console.log('-- QSOList stylesForDeleted', stylesForDeleted), [stylesForDeleted])
  // useEffect(() => console.log('-- QSOList stylesForOtherOperator', stylesForOtherOperator), [stylesForOtherOperator])
  // useEffect(() => console.log('-- QSOList listRef', listRef), [listRef])

  // When the lastQSO changes, scroll to it
  useEffect(() => {
    if (!sections || !sections.length) return
    let sectionIndex = sections.length - 1
    let itemIndex = sections[sectionIndex].data.length - 1
    if (lastUUID) {
      sections.find((section, i) => {
        return section.data.find((qso, j) => {
          if (qso.uuid === lastUUID) {
            sectionIndex = i
            itemIndex = j
            return true
          }
          return false
        })
      })
    }

    if (scrollTimeout) {
      clearTimeout(scrollTimeout)
    }

    scrollTimeout = setTimeout(() => {
      try {
        listRef.current?.scrollToLocation({ sectionIndex, itemIndex, animated: true })
      } catch (e) {
        // Sometimes the QSO list can change before this timeout call is executed
        console.error('Error scrolling to last QSO', e)
      }
    }, 50)
  }, [listRef, lastUUID, sections])

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
    if (styles.extendedWidth) {
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
      getItemHeight: styles.compactRow.height + styles.compactRow.borderBottomWidth,
      getSectionHeaderHeight: styles.headerRow.height + styles.headerRow.borderBottomWidth
    }),
    [styles]
  )

  const extractKey = useCallback((item, index) => item.uuid, [])
  const emptyComponent = useCallback(() => (
    <ListEmptyComponent styles={styles} vfo={vfo} />
  ), [styles, vfo])

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

const ListEmptyComponent = React.memo(function ListEmptyComponent ({ styles, vfo }) {
  return (
    <View style={{ flexDirection: 'column' }}>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>
        No QSOs yet!
      </Text>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 8, textAlign: 'center' }}>
        Currently set to
      </Text>
      <Text style={{ flex: 1, marginTop: styles.oneSpace * 1, textAlign: 'center', fontWeight: 'bold' }}>
        {[vfo.freq ? fmtFreqInMHz(vfo.freq) + ' MHz' : vfo.band, vfo.mode].filter(x => x).join(' • ')}
      </Text>
    </View>
  )
})

function _prepareStyles (themeStyles, { width, safeArea }) {
  const extendedWidth = width / themeStyles.oneSpace > 80
  const narrowWidth = width / themeStyles.oneSpace < 50

  const DEBUG = false

  const commonStyles = {
    fontSize: themeStyles.normalFontSize,
    lineHeight: PixelRatio.roundToNearestPixel(themeStyles.normalFontSize * (themeStyles.isIOS ? 1.5 : 1.4)),
    borderWidth: DEBUG ? 1 : 0,
    color: themeStyles.colors.onBackground
  }

  const styles = {
    ...themeStyles,
    extendedWidth,
    narrowWidth,

    row: {
      height: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 4.3),
      maxHeight: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 4.3),
      minHeight: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 4.3),
      paddingHorizontal: themeStyles.oneSpace,
      paddingTop: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 0.6),
      borderBottomWidth: 1,
      borderBottomColor: themeStyles.colors.outlineVariant,
      flexDirection: 'row',
      width: '100%',
      paddingLeft: safeArea?.left || 0
    },
    rowInner: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'flex-start',
      justifyContent: 'flex-start',
      width: '100%'
    },
    selectedRow: {
      backgroundColor: themeStyles.colors.secondaryContainer,
      borderTopWidth: 3,
      borderBottomWidth: 3,
      borderTopColor: themeStyles.colors.secondary,
      borderBottomColor: themeStyles.colors.secondary,
      paddingTop: 1,
      marginTop: 0 // PixelRatio.roundToNearestPixel(themeStyles.oneSpace * -0.1)
      // marginBottom: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 0.4)
    },
    headerRow: {
      ...themeStyles.compactRow,
      backgroundColor: themeStyles.colors.surfaceVariant,
      paddingLeft: safeArea?.left || 0,
      borderTopWidth: 0,
      borderBottomWidth: 2,
      borderTopColor: themeStyles.colors.onBackgroundLight,
      borderBottomColor: themeStyles.colors.onBackgroundLight
    },
    eventRow: {
      backgroundColor: 'rgb(252, 244, 167)',
      opacity: themeStyles.isDarkMode ? 0.65 : 0.85
      // borderTopColor: 'rgb(97, 92, 47)',
      // borderTopWidth: 1
    },
    segmentRow: {
      backgroundColor: themeStyles.colors.primaryLighter,
      borderBottomWidth: 0
      // borderTopWidth: 3,
      // borderColor: themeStyles.colors.primary,
      // paddingTop: 1,
      // marginTop: 0
    },

    eventContent: {
      color: 'rgb(97, 92, 47)'
    },
    segmentContent: {
      color: themeStyles.colors.onPrimary
    },
    deletedContent: {
      textDecorationLine: 'line-through',
      textDecorationColor: themeStyles.colors.onBackground,
      color: themeStyles.colors.onBackgroundLighter
    },
    otherOperatorContent: {
      opacity: 0.7
    },

    fields: {
      header: {
        ...commonStyles,
        fontFamily: themeStyles.fontFamily,
        flex: 0,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'left'
      },
      event: {
        ...commonStyles,
        lineHeight: PixelRatio.roundToNearestPixel(themeStyles.normalFontSize * (themeStyles.isIOS ? 1.5 : 1.4)),
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        minWidth: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 3.5),
        textAlign: 'left',
        flex: 1
      },
      markdown: {
        lineHeight: PixelRatio.roundToNearestPixel(themeStyles.normalFontSize * (themeStyles.isIOS ? 1.5 : 1.4))
      },
      number: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        flex: 0,
        marginLeft: 0,
        minWidth: extendedWidth ? themeStyles.oneSpace * 4 : themeStyles.oneSpace * 3,
        textAlign: 'right'
      },
      time: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        minWidth: extendedWidth ? themeStyles.oneSpace * 10 : themeStyles.oneSpace * 7,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      freq: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        // fontFamily: 'Roboto',
        flex: 0,
        minWidth: extendedWidth ? themeStyles.oneSpace * 10 : themeStyles.oneSpace * 8,
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        marginTop: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 0.1),
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
        fontSize: PixelRatio.roundToNearestPixel(themeStyles.normalFontSize * 0.7)
      },
      call: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        ...themeStyles.text.callsignBold,
        flex: 0,
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        minWidth: themeStyles.oneSpace * 8,
        textAlign: 'left'
      },
      name: {
        ...commonStyles,
        flex: 1,
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        textAlign: 'left'
      },
      location: {
        ...commonStyles,
        flex: 0,
        marginLeft: themeStyles.oneSpace * (extendedWidth ? 2 : 1),
        minWidth: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 3.5),
        textAlign: 'center'
      },
      signal: {
        ...commonStyles,
        ...themeStyles.text.numbers,
        ...themeStyles.text.lighter,
        flex: 0,
        minWidth: themeStyles.oneSpace * 3,
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      exchange: {
        ...commonStyles,
        ...themeStyles.text.callsign,
        flex: 0,
        minWidth: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 8.5),
        marginLeft: themeStyles.oneSpace,
        textAlign: 'right'
      },
      icons: {
        ...commonStyles,
        flex: 0,
        flexDirection: 'row',
        textAlign: 'right',
        marginLeft: themeStyles.oneSpace,
        minWidth: themeStyles.oneSpace * 0,
        maxWidth: themeStyles.oneSpace * 9
      },
      icon: {
        ...commonStyles,
        flex: 0,
        marginTop: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 0.45),
        width: PixelRatio.roundToNearestPixel(themeStyles.oneSpace * 1.8)
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
