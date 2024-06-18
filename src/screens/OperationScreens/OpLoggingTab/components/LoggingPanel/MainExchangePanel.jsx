/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo, useRef } from 'react'

import { View, findNodeHandle, useWindowDimensions } from 'react-native'
import CallsignInput from '../../../../components/CallsignInput'
import RSTInput from '../../../../components/RSTInput'
import ThemedTextInput from '../../../../components/ThemedTextInput'
import { findRef } from '../../../../../tools/refTools'
import { findHooks } from '../../../../../extensions/registry'

export const MainExchangePanel = ({
  qso, operation, vfo, settings, style, styles, themeColor, onSubmitEditing, handleFieldChange, setQSO, updateQSO, mainFieldRef, focusedRef
}) => {
  const { width } = useWindowDimensions()

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
  const keyHandler = useCallback((event) => {
    const { nativeEvent: { key, target } } = event
    if (key === ' ') {
      const renderedRefs = refs.filter(x => x?.current)
      const pos = renderedRefs.map(r => findNodeHandle(r.current)).indexOf(target)

      if (pos >= 0) {
        const next = (pos + 1) % renderedRefs.length
        setTimeout(() => {
          renderedRefs[next]?.current?.focus()
        }, 0)
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
        keyHandler && keyHandler({ nativeEvent: { key: ' ', target: event?.nativeEvent?.target } })
      }
    }
  }, [handleFieldChange, keyHandler, rstLength, settings])

  let fields = []
  fields.push(
    <CallsignInput
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
      onKeyPress={keyHandler}
      focusedRef={focusedRef}
    />
  )
  const rstFieldRefs = [refStack.shift(), refStack.shift()]
  if (settings.switchSentRcvd) rstFieldRefs.reverse()
  const rstFieldProps = {
    themeColor,
    style: [styles?.text?.numbers, { minWidth: styles.oneSpace * 5.7, flex: 1 }],
    onChange: handleRSTChange,
    onSubmitEditing,
    onKeyPress: keyHandler,
    focusedRef,
    radioMode: qso?.mode ?? vfo?.mode ?? 'SSB'
  }

  const rstFields = [
    <RSTInput
      {...rstFieldProps}
      key="sent"
      innerRef={rstFieldRefs.shift()}
      value={qso?.our?.sent ?? ''}
      label="Sent"
      fieldId={'ourSent'}
    />,
    <RSTInput
      {...rstFieldProps}
      key="received"
      innerRef={rstFieldRefs.shift()}
      value={qso?.their?.sent || ''}
      label="Rcvd"
      fieldId={'theirSent'}
    />
  ]
  if (settings.switchSentRcvd) rstFields.reverse()
  fields = fields.concat(rstFields)

  findHooks('activity').filter(activity => activity.mainExchangeForOperation && findRef(operation, activity.key)).forEach(activity => {
    fields = fields.concat(
      activity.mainExchangeForOperation(
        { qso, operation, vfo, settings, styles, themeColor, onSubmitEditing, setQSO, updateQSO, keyHandler, refStack, focusedRef }
      ) || []
    )
  })
  findHooks('activity').filter(activity => activity.mainExchangeForQSO).forEach(activity => {
    fields = fields.concat(
      activity.mainExchangeForQSO(
        { qso, operation, vfo, settings, styles, themeColor, onSubmitEditing, setQSO, updateQSO, keyHandler, refStack, focusedRef }
      ) || []
    )
  })

  if (settings.showStateField) {
    fields.push(
      <ThemedTextInput
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
        onKeyPress={keyHandler}
        keyboard={'dumb'}
        maxLength={5}
        focusedRef={focusedRef}
      />
    )
  }

  if (fields.length > 4 && width / styles.oneSpace < 60) {
    fields = [fields[0], ...fields.slice(3)] // exclude the RST fields
  }

  return (
    <View style={{ ...style, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'stretch', gap: styles.oneSpace }}>
      {fields}
    </View>
  )
}
