/*
 * Copyright ©️ 2025 Sebastian Delmont < sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React from 'react'
import { IconButton } from 'react-native-paper'

import { H2kTextInput } from '../../../../../../ui'
import { View } from 'react-native'

export default function TodoEventFields ({
  qso, qsos, operation, vfo, settings,
  style, styles, themeColor, isKeyboardVisible, splitView,
  disabled,
  onSubmitEditing, handleFieldChange, setQSO, updateQSO, mainFieldRef, focusedRef
}) {
  return (
    <>
      <View style={{ flex: 0, width: styles.oneSpace * 7 }}>
        <IconButton
          icon={qso.event?.done ? 'sticker-check-outline' : 'sticker'}
          onPress={() => handleFieldChange({ fieldId: 'eventDone', value: !qso.event?.done })}
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
