/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo, useRef } from 'react'

import { View, findNodeHandle } from 'react-native'
import { findRef } from '../../../../../tools/refTools'
import { findHooks } from '../../../../../extensions/registry'
import { H2kCallsignInput, H2kRSTInput, H2kTextInput } from '../../../../../ui'
import { expandRSTValues } from '../../../../../tools/callsignTools'

export const MainExchangePanel = ({
  qso, qsos, operation, vfo, settings, style, styles, themeColor, disabled,
  onSubmitEditing, handleFieldChange, setQSO, updateQSO, mainFieldRef, focusedRef,
  allowSpacesInCallField
}) => {
  // We need to pre-allocate a ref for the main field, in case `mainFieldRef` is not provided
  // but since hooks cannot be called conditionally, we just need to create it whether we need it or not
  const alternateCallFieldRef = useRef()

  // the first ref will correspond to the call field
  const ref0 = mainFieldRef || alternateCallFieldRef
  // Add enough refs for whatever fields might get added
  const ref1 = useRef()
  const ref2 = useRef()
  const ref3 = useRef()
  const ref4 = useRef()
  const ref5 = useRef()
  const ref6 = useRef()
  const ref7 = useRef()
  const ref8 = useRef()
  const ref9 = useRef()
  const refs = useMemo(() => ([ref0, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9]), [ref0, ref1, ref2, ref3, ref4, ref5, ref6, ref7, ref8, ref9])

  // Make a copy since `refStack` will be used to distribute refs to each component and it gets modified
  const refStack = [...refs]

  // Switch between fields with the space key
  const spaceHandler = useCallback((event) => {
    const { nativeEvent: { key, target } } = event
    if (key === ' ') {
      const renderedRefs = refs.filter(x => x?.current)
      const pos = renderedRefs.map(r => findNodeHandle(r.current)).indexOf(target)

      if (pos >= 0) {
        const next = (pos + 1) % renderedRefs.length
        setTimeout(() => {
          renderedRefs[next]?.current?.focus()
        }, 100)
      }
    }
  }, [refs])

  const rstLength = useMemo(() => {
    if (qso?.mode === 'CW' || qso?.mode === 'RTTY') return 3
    if (qso?.mode === 'FT8' || qso?.mode === 'FT4') return 3
    return 2
  }, [qso?.mode])

  // For RST fields, switch to the next field after a full signal report is entered
  const handleRSTChange = useCallback((event) => {
    const value = event?.value || event?.nativeEvent?.text

    handleFieldChange && handleFieldChange(event)
    if (settings.jumpAfterRST) {
      if (value.length >= rstLength) {
        spaceHandler && spaceHandler({ nativeEvent: { key: ' ', target: event?.nativeEvent?.target } })
      }
    }
  }, [handleFieldChange, spaceHandler, rstLength, settings])

  const handleRSTBlur = useCallback((event) => {
    const text = event?.value || event?.nativeEvent?.text || ''
    const mode = qso?.mode ?? vfo?.mode ?? 'SSB'
    if (text.trim().length === 1) {
      const expanded = expandRSTValues(text, mode)
      if (expanded !== text) {
        handleFieldChange && handleFieldChange({ ...event, value: expanded, nativeEvent: { ...event?.nativeEvent, text } })
      }
    }

    return true
  }, [handleFieldChange, qso, vfo?.mode])

  let fields = []
  fields.push(
    <H2kCallsignInput
      key="call"
      innerRef={refStack.shift()}
      themeColor={themeColor}
      style={[styles.input, { minWidth: styles.oneSpace * 10, flex: 10 }]}
      value={qso?.their?.call ?? ''}
      label="Their Call"
      placeholder=""
      onChange={handleFieldChange}
      onSubmitEditing={onSubmitEditing}
      fieldId={'theirCall'}
      noSpaces={!allowSpacesInCallField}
      onSpace={spaceHandler}
      focusedRef={focusedRef}
      allowMultiple={true}
      allowStack={true}
      disabled={disabled}
    />
  )

  if (settings.showRSTFields !== false) {
    const rstFieldRefs = [refStack.shift(), refStack.shift()]
    if (settings.switchSentRcvd) rstFieldRefs.reverse()
    const rstFieldProps = {
      themeColor,
      style: [styles?.text?.numbers, { minWidth: styles.oneSpace * 5.7, flex: 1 }],
      onChange: handleRSTChange,
      onBlur: handleRSTBlur,
      onSubmitEditing,
      onSpace: spaceHandler,
      focusedRef,
      radioMode: qso?.mode ?? vfo?.mode ?? 'SSB'
    }

    const rstFields = [
      <H2kRSTInput
        {...rstFieldProps}
        key="sent"
        innerRef={rstFieldRefs.shift()}
        value={qso?.our?.sent ?? ''}
        label="Sent"
        fieldId={'ourSent'}
        disabled={disabled}
      />,
      <H2kRSTInput
        {...rstFieldProps}
        key="received"
        innerRef={rstFieldRefs.shift()}
        value={qso?.their?.sent || ''}
        label="Rcvd"
        fieldId={'theirSent'}
        disabled={disabled}
      />
    ]
    if (settings.switchSentRcvd) rstFields.reverse()
    fields = fields.concat(rstFields)
  }

  let hideStateField = false

  findHooks('activity').filter(activity => activity.mainExchangeForOperation && findRef(operation, activity.key)).forEach(activity => {
    if (activity.hideStateField) hideStateField = true
    fields = fields.concat(
      activity.mainExchangeForOperation(
        { qso, qsos, operation, vfo, settings, styles, themeColor, disabled, onSubmitEditing, setQSO, updateQSO, onSpace: spaceHandler, refStack, focusedRef }
      ) || []
    )
  })
  findHooks('activity').filter(activity => activity.mainExchangeForQSO).forEach(activity => {
    if (activity.hideStateField) hideStateField = true
    fields = fields.concat(
      activity.mainExchangeForQSO(
        { qso, operation, vfo, settings, styles, themeColor, disabled, onSubmitEditing, setQSO, updateQSO, onSpace: spaceHandler, refStack, focusedRef }
      ) || []
    )
  })

  if (settings.showStateField && !hideStateField) {
    fields.push(
      <H2kTextInput
        key="state"
        innerRef={refStack.shift()}
        themeColor={themeColor}
        style={[styles.input, { minWidth: styles.oneSpace * 5.7, flex: 1 }]}
        value={qso?.their?.state ?? ''}
        label="State"
        placeholder={qso?.their?.guess?.state ?? ''}
        uppercase={true}
        noSpaces={true}
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'state'}
        onSpace={spaceHandler}
        keyboard={'dumb'}
        maxLength={5}
        focusedRef={focusedRef}
        disabled={disabled}
      />
    )
  }

  return (
    <View style={styles.mainExchangePanel.container}>
      {fields}
    </View>
  )
}
