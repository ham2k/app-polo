/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ScrollView, View } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { ADIF_MODES_AND_SUBMODES, EXTENDED_BANDS, MAIN_MODES, POPULAR_BANDS, POPULAR_MODES } from '@ham2k/lib-operation-data'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useTranslation } from 'react-i18next'

import { selectSettings, setSettings } from '../../../store/settings'
import ScreenContainer from '../../components/ScreenContainer'
import { H2kListItem, H2kListSection } from '../../../ui'

const ACCESSIBILITY_TEXT_FOR_BAND = {
  '160m': '160 Meters',
  '80m': '80 Meters',
  '60m': '60 Meters',
  '40m': '40 Meters',
  '30m': '30 Meters',
  '20m': '20 Meters',
  '17m': '17 Meters',
  '15m': '15 Meters',
  '12m': '12 Meters',
  '11m': '11 Meters',
  '10m': '10 Meters',
  '6m': '6 Meters',
  '2m': '2 Meters',
  '70cm': '70 Centimeters',
  '23cm': '23 Centimeters',
  '13cm': '13 Centimeters',
  '9cm': '9 Centimeters',
  '6cm': '6 Centimeters',
  '3cm': '3 Centimeters',
  '1.25cm': '1.25 Centimeters',
  '6mm': '6 Millimeters',
  '4mm': '4 Millimeters',
  '2.5mm': '2.5 Millimeters',
  '2mm': '2 Millimeters',
  '1mm': '1 Millimeters',
  submm: 'Submillimeter',
  other: 'Other Band'
}

const ACCESSIBILITY_TEXT_FOR_MODE = {
  SSB: 'Single Sideband',
  USB: 'Upper Sideband',
  LSB: 'Lower Sideband',
  RTTY: 'Ritty',
  CW: 'C.W.',
  other: 'Other Mode'
}

export default function BandModeSettingsScreen ({ navigation, splitView }) {
  const { t } = useTranslation()

  const dispatch = useDispatch()
  const safeAreaInsets = useSafeAreaInsets()

  const settings = useSelector(selectSettings)

  const setBand = useCallback((band, value) => {
    let newBands

    if (value) {
      newBands = [...settings.bands, band]
    } else {
      newBands = settings.bands.filter(item => item !== band)
    }

    newBands = newBands.filter(b => EXTENDED_BANDS.includes(b))
    newBands.sort((a, b) => EXTENDED_BANDS.indexOf(a) - EXTENDED_BANDS.indexOf(b))
    dispatch(setSettings({ bands: newBands }))
  }, [dispatch, settings?.bands])

  const setMode = useCallback((mode, value) => {
    let newModes

    if (value) {
      newModes = [...settings.modes, mode]
    } else {
      newModes = settings.modes.filter(item => item !== mode)
    }

    newModes = newModes.filter(m => ADIF_MODES_AND_SUBMODES.includes(m))
    newModes.sort((a, b) => (POPULAR_MODES.indexOf(a) ?? (ADIF_MODES_AND_SUBMODES.index(a) + 100)) - (POPULAR_MODES.indexOf(b) ?? (ADIF_MODES_AND_SUBMODES.index(b) + 100)))
    dispatch(setSettings({ modes: newModes }))
  }, [dispatch, settings?.modes])

  const [moreBands, setMoreBands] = useState()

  useEffect(() => {
    if (moreBands === undefined) {
      if ((settings.bands ?? []).find(band => !POPULAR_BANDS.includes(band))) {
        setMoreBands(true)
      } else {
        setMoreBands(false)
      }
    }
  }, [moreBands, settings?.bands])

  const bandOptions = useMemo(() => {
    if (moreBands || (settings.bands ?? []).find(band => !POPULAR_BANDS.includes(band))) {
      return EXTENDED_BANDS
    } else {
      return POPULAR_BANDS
    }
  }, [moreBands, settings?.bands])

  const [moreModes, setMoreModes] = useState()

  useEffect(() => {
    if (moreModes === undefined) {
      if ((settings.modes ?? []).find(mode => !POPULAR_MODES.includes(mode))) {
        setMoreModes(2)
      } else if ((settings.modes ?? []).find(mode => !MAIN_MODES.includes(mode))) {
        setMoreModes(1)
      } else {
        setMoreModes(0)
      }
    }
  }, [moreModes, settings?.modes])

  const modeOptions = useMemo(() => {
    if (moreModes === 2 || (settings.modes ?? []).find(mode => !POPULAR_MODES.includes(mode))) {
      return ADIF_MODES_AND_SUBMODES
    } else if (moreModes === 1 || (settings.modes ?? []).find(mode => !MAIN_MODES.includes(mode))) {
      return POPULAR_MODES
    } else {
      return MAIN_MODES
    }
  }, [moreModes, settings?.modes])

  return (
    <ScreenContainer>
      <ScrollView style={{ flex: 1, marginLeft: splitView ? 0 : safeAreaInsets.left, marginRight: safeAreaInsets.right }}>
        <H2kListSection title={t('screens.bandModeSettings.bands.title', 'Bands')}>
          {bandOptions.map((band) => (
            <H2kListItem
              key={band}
              title={t(`screens.bandModeSettings.bands.names.${band.replace('.', '-')}`, band)}
              accessibilityTitle={t(`screens.bandModeSettings.bands.names.${band.replace('.', '-')}-a11y`, ACCESSIBILITY_TEXT_FOR_BAND[band] || band)}
              rightSwitchValue={settings.bands.includes(band)}
              rightSwitchOnValueChange={(value) => setBand(band, value)}
              onPress={() => setBand(band, !settings.bands.includes(band))}
            />
          ))}
          <H2kListItem
            title={moreBands ? t('screens.bandModeSettings.bands.showCommonBands', 'Show common bands') : t('screens.bandModeSettings.bands.showAllBands', 'Show all bands')}
            onPress={() => setMoreBands(!moreBands)}
          />
        </H2kListSection>

        <H2kListSection title={t('screens.bandModeSettings.modes.title', 'Modes')}>
          {modeOptions.map((mode) => (
            <H2kListItem
              key={mode}
              title={t(`screens.bandModeSettings.modes.names.${mode}`, mode)}
              accessibilityTitle={t(`screens.bandModeSettings.modes.names.${mode}-a11y`, ACCESSIBILITY_TEXT_FOR_MODE[mode] || mode)}
              rightSwitchValue={settings.modes.includes(mode)}
              rightSwitchOnValueChange={(value) => setMode(mode, value)}
              onPress={() => setMode(mode, !settings.modes.includes(mode))}
            />
          ))}
          <H2kListItem
            title={{ 0: t('screens.bandModeSettings.modes.showMoreModes', 'Show more modes'), 1: t('screens.bandModeSettings.modes.showEvenMoreModes', 'Show even more modes'), 2: t('screens.bandModeSettings.modes.showFewerModes', 'Show fewer modes') }[moreModes] ?? t('screens.bandModeSettings.modes.showMoreModes', 'Show more modes')}
            onPress={() => setMoreModes(moreModes + 1 % 3)}
          />
        </H2kListSection>

        <View style={{ height: safeAreaInsets.bottom }} />
      </ScrollView>
    </ScreenContainer>
  )
}
