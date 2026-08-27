// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import React, { useEffect, useMemo, useRef } from 'react'
import { View } from 'react-native'
import { useTranslation } from 'react-i18next'

import { ADIF_MODES_AND_SUBMODES, BANDS, POPULAR_BANDS, POPULAR_MODES } from '@ham2k/lib-operation-data'
import { fmtFreq } from '@ham2k/lib-format-tools'

import { H2kDropDown, H2kFrequencyInput } from '../../../../../../ui'
import { radioValuesFor } from '../loggingFunctions'

const RadioControlInputs = ({ qso, operation, vfo, settings, disabled, icon, style, styles, themeColor, handleFieldChange, onSubmitEditing, focusedRef }) => {
  const { t } = useTranslation()

  const ref = useRef()
  useEffect(() => { setTimeout(() => ref?.current?.focus(), 200) }, [])

  const bandOptions = useMemo(() => {
    const options = [...settings?.bands || POPULAR_BANDS]
    if (!options.includes(qso?.band)) options.push(qso?.band)
    if (!options.includes(vfo?.band)) options.push(vfo?.band)
    options.sort((a, b) => BANDS.indexOf(a) - BANDS.indexOf(b))
    if (!options.includes('other')) options.concat(['other'])

    return options.filter(x => x).map(band => ({ value: band, label: band }))
  }, [vfo?.band, qso?.band, settings?.bands])

  const modeOptions = useMemo(() => {
    const options = [...settings?.modes || POPULAR_MODES]
    if (!options.includes(qso?.mode)) options.push(qso?.mode)
    if (!options.includes(vfo?.mode)) options.push(vfo?.mode)
    options.sort((a, b) => (POPULAR_MODES.indexOf(a) ?? (ADIF_MODES_AND_SUBMODES.index(a) + 100)) - (POPULAR_MODES.indexOf(b) ?? (ADIF_MODES_AND_SUBMODES.index(b) + 100)))
    if (!options.includes('other')) options.concat(['other'])

    return options.filter(x => x).map(mode => ({ value: mode, label: mode }))
  }, [vfo?.mode, qso?.mode, settings?.modes])

  const bandValue = useMemo(() => {
    if (qso?.event) {
      return vfo?.band ?? ''
    } else if (qso?._isNew) {
      return qso?.band ?? vfo?.band ?? ''
    } else {
      return qso?.band ?? ''
    }
  }, [qso?._isNew, qso?.event, qso?.band, vfo?.band])

  const freqValue = useMemo(() => {
    if (qso?.event) {
      return vfo?.freq ?? ''
    } else if (qso?._isNew) {
      return qso?.freq ?? vfo?.freq ?? ''
    } else {
      return qso?.freq ?? ''
    }
  }, [qso?._isNew, qso?.event, qso?.freq, vfo?.freq])

  const modeValue = useMemo(() => {
    if (qso?.event) {
      return vfo?.mode ?? ''
    } else if (qso?._isNew) {
      return qso?.mode ?? vfo?.mode ?? ''
    } else {
      return qso?.mode ?? ''
    }
  }, [qso?._isNew, qso?.event, qso?.mode, vfo?.mode])
  return (
    <View style={{ flexDirection: 'row', paddingHorizontal: 0, gap: styles.oneSpace }}>
      <H2kDropDown
        label={t('screens.opLoggingTab.bandLabel', 'Band')}
        themeColor={themeColor}
        value={bandValue}
        onChange={handleFieldChange}
        disabled={disabled || qso?.event}
        dropDownContainerMaxHeight={styles.oneSpace * 19}
        fieldId={'band'}
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 12 : 14) }}
        options={bandOptions}
      />
      <H2kFrequencyInput
        innerRef={ref}
        themeColor={themeColor}
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 10 : 12) }}
        value={freqValue}
        disabled={disabled}
        label={t('screens.opLoggingTab.frequencyLabel', 'Frequency')}
        placeholder=""
        onChange={handleFieldChange}
        onSubmitEditing={onSubmitEditing}
        fieldId={'freq'}
        focusedRef={focusedRef}
      />
      <H2kDropDown
        label={t('screens.opLoggingTab.modeLabel', 'Mode')}
        value={modeValue}
        onChange={handleFieldChange}
        disabled={disabled}
        dropDownContainerMaxHeight={styles.oneSpace * 19}
        fieldId={'mode'}
        style={{ width: styles.oneSpace * (styles.size === 'xs' ? 12 : 14) }}
        options={modeOptions}
      />
    </View>
  )
}

// `modeForFrequency` returns `false` when the frequency is outside any known band,
// which is not a mode we can show or offer as a choice, so the pill says "out of band".
function modeLabelFor ({ mode, t }) {
  if (mode === false) return t('screens.opLoggingTab.modeOutOfBand', 'OOB')
  return `${mode ?? 'SSB'}`
}

export const radioControl = {
  key: 'radio',
  icon: 'radio',
  order: 1,
  label: ({ t, qso, operation, vfo, settings }) => {
    const { band, freq, mode } = radioValuesFor({ qso, vfo })
    const parts = []

    if (freq) {
      parts.push(`${fmtFreq(freq)} MHz`)
    } else if (band) {
      parts.push(`${band}`)
    } else {
      parts.push(t('screens.opLoggingTab.bandMissing', 'Band???'))
    }
    parts.push(modeLabelFor({ mode, t }))

    return parts.join(' • ')
  },
  accessibilityLabel: ({ qso, t, operation, vfo, settings }) => {
    const { band, freq, mode } = radioValuesFor({ qso, vfo })
    const parts = []

    if (freq) {
      parts.push(`${fmtFreq(freq)} MHz`)
    } else if (band) {
      parts.push(`${band}`)
    } else {
      parts.push(t('screens.opLoggingTab.bandMissing', 'Band???'))
    }
    parts.push(modeLabelFor({ mode, t }))

    return t('screens.opLoggingTab.radioControls-a11y', 'Radio Controls, {{parts}}', { parts: parts.join(', ') }) || `Radio Controls, ${parts.join(', ')}`
  },
  // Highlight the control when we have no band or mode, since those cannot be recovered later
  themeColor: ({ qso, vfo }) => {
    if (!qso) return undefined // Between QSOs there is nothing to complain about
    const { band, freq, mode } = radioValuesFor({ qso, vfo })
    if (!(band || freq) || !mode) return 'error'
  },
  InputComponent: RadioControlInputs,
  inputWidthMultiplier: 43,
  optionType: 'mandatory'
}
