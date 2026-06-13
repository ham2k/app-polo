// Copyright ©️ 2025 Sebastian Delmont < sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'
import { IconButton } from 'react-native-paper'

import { H2kTextInput } from '../../../../../../ui'
import { View } from 'react-native'

export default function TodoEventFields ({
  qso, qsos, operation, vfo, settings,
  style, styles, themeColor, isKeyboardVisible, splitView,
  disabled,
  onSubmitEditing, handleFieldChange, updateQSO, mainFieldRef, focusedRef
}) {
  return (
    <>
      <View style={{ flex: 0, width: styles.oneSpace * 7 }}>
        <IconButton
          icon={qso.event?.data?.done ?? qso.event?.done ? 'sticker-check-outline' : 'sticker'}
          onPress={() => handleFieldChange({ fieldId: 'eventData', value: { done: !(qso.event?.data?.done ?? qso.event?.done) } })}
          mode="outlined"
        />
      </View>
      <H2kTextInput
        themeColor={themeColor}
        style={{ flex: 1 }}
        value={qso.event?.note}
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        label="To-do item"
        fieldId="eventNote"
        uppercase={true}
        ref={mainFieldRef}
        focusedRef={focusedRef}
      />
    </>
  )
}
