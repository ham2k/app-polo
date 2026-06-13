// Copyright ©️ 2025 Sebastian Delmont < sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React from 'react'

import { H2kTextInput } from '../../../../../../ui'

export default function NoteEventFields ({
  qso, qsos, operation, vfo, settings,
  style, styles, themeColor, isKeyboardVisible, splitView,
  disabled,
  onSubmitEditing, handleFieldChange, updateQSO, mainFieldRef, focusedRef
}) {
  return (
    <H2kTextInput
      themeColor={themeColor}
      style={{ flex: 1 }}
      value={qso.event?.note}
      onChange={handleFieldChange}
      onSubmitEditing={onSubmitEditing}
      label="Note"
      fieldId="eventNote"
      uppercase={true}
      ref={mainFieldRef}
      focusedRef={focusedRef}
    />
  )
}
