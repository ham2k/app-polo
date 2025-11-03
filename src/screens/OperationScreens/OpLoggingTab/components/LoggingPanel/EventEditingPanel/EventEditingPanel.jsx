/*
 * Copyright ©️ 2025 Sebastian Delmont < sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { Text, View } from 'react-native'

import { H2kMarkdown } from '../../../../../../ui'
import { useThemedStyles } from '../../../../../../styles/tools/useThemedStyles'
import NoteEventFields from './NoteEventFields'
import TodoEventFields from './TodoEventFields'

export default function EventEditingPanel ({
  qso, qsos, operation, vfo, settings,
  style, themeColor, isKeyboardVisible, splitView,
  disabled,
  onSubmitEditing, handleFieldChange, setQSO, updateQSO, mainFieldRef, focusedRef,
  allowSpacesInCallField
}) {
  const styles = useThemedStyles(prepareStyles, { style })

  const { event } = qso
  console.log('event', event)
  if (event?.event === 'note') {
    return (
      <View style={[styles.root, style]}>
        <View style={{ width: '100%', flexDirection: 'row' }}>
          <NoteEventFields
            qso={qso}
            qsos={qsos}
            operation={operation}
            vfo={vfo}
            settings={settings}
            themeColor={themeColor}
            style={{ flex: 1 }}
            styles={styles}
            handleFieldChange={handleFieldChange}
            onSubmitEditing={onSubmitEditing}
            setQSO={setQSO}
            updateQSO={updateQSO}
            mainFieldRef={mainFieldRef}
            focusedRef={focusedRef}
          />
        </View>
      </View>
    )
  } else if (event?.event === 'todo') {
    return (
      <View style={[styles.root, style]}>
        <View style={{ width: '100%', flexDirection: 'row' }}>
          <TodoEventFields
            qso={qso}
            qsos={qsos}
            operation={operation}
            vfo={vfo}
            settings={settings}
            themeColor={themeColor}
            style={{ flex: 1 }}
            styles={styles}
            handleFieldChange={handleFieldChange}
            onSubmitEditing={onSubmitEditing}
            setQSO={setQSO}
            updateQSO={updateQSO}
            mainFieldRef={mainFieldRef}
            focusedRef={focusedRef}
          />
        </View>
      </View>
    )
  } else {
    return (
      <View style={styles.root}>
        <Text style={{ fontSize: styles.normalFontSize, fontWeight: 'bold', paddingBottom: styles.oneSpace }}>
          <H2kMarkdown styles={styles}>{qso.event?.description}</H2kMarkdown>
        </Text>
      </View>
    )
  }
}

function prepareStyles (themeStyles, { style }) {
  return {
    ...themeStyles,
    root: {
      ...style,
      minHeight: themeStyles.panelSize,
      maxHeight: themeStyles.panelSize,
      height: themeStyles.panelSize
    }
  }
}
