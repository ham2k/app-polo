/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useEffect, useRef } from 'react'
import { View } from 'react-native'
import { useDispatch } from 'react-redux'
import { useTranslation } from 'react-i18next'

import TimeChip from '../../../../components/TimeChip'
import { setOperationLocalData } from '../../../../../../store/operations'
import { H2kButton, H2kDateInput, H2kTimeInput } from '../../../../../../ui'

import GLOBAL from '../../../../../../GLOBAL'

const TimeControlInputs = ({ qso, operation, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const { t } = useTranslation()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const dispatch = useDispatch()

  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <H2kTimeInput
        innerRef={ref}
        themeColor={themeColor}
        style={{ minWidth: styles.oneSpace * 11 }}
        valueInMillis={qso?.startAtMillis}
        disabled={disabled}
        label={t('screens.opLoggingTab.timeLabel', 'Time')}
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'time'}
        focusedRef={focusedRef}
      />
      <H2kDateInput
        themeColor={themeColor}
        style={{ minWidth: styles.oneSpace * 11 }}
        valueInMillis={qso?.startAtMillis}
        disabled={disabled}
        label={t('screens.opLoggingTab.dateLabel', 'Date')}
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'date'}
        focusedRef={focusedRef}
      />
      {qso?._isNew && (operation.local?._nextManualTime || qso?.startAtMillis) && (
        <View flexDirection="column" alignItems={'center'} justifyContent={'center'}>
          <H2kButton
            themeColor="tertiaryLighter"
            mode="contained"
            icon={'play'}
            onPress={(value) => {
              handleFieldChange({ fieldId: 'time', value: undefined })
              dispatch(setOperationLocalData({ uuid: operation.uuid, _nextManualTime: undefined }))
              ref.current?.blur()
            }}
          >
            Back to now
          </H2kButton>
        </View>
      )}
    </View>
  )
}

export const timeControl = {
  key: 'time',
  icon: 'clock-outline',
  order: 0,
  LabelComponent: (props) => {
    if (props.operation?.local?._nextManualTime) {
      return (
        <TimeChip {...props} icon={'pause'} iconColor={'red'} accessibilityLabel={props.t('screens.opLoggingTab.timeControls-a11y', 'Time Controls')} time={props?.qso?.startAtMillis} />
      )
    } else {
      return (
        <TimeChip {...props} accessibilityLabel={props.t('screens.opLoggingTab.timeControls-a11y', 'Time Controls')} time={props?.qso?.startAtMillis} />
      )
    }
  },
  accessibilityLabel: GLOBAL?.t?.('screens.opLoggingTab.timeControls-a11y', 'Time Controls') || 'Time Controls',
  InputComponent: TimeControlInputs,
  optionType: 'mandatory'
}
