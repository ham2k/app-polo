/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Switch } from 'react-native-paper'
import { ScrollView } from 'react-native'
import { useDispatch, useSelector } from 'react-redux'
import { ADIF_MODES_AND_SUBMODES, BANDS, MAIN_MODES, POPULAR_BANDS, POPULAR_MODES } from '@ham2k/lib-operation-data'

import { selectSettings, setSettings } from '../../../store/settings'
import ScreenContainer from '../../components/ScreenContainer'
import { Ham2kListItem } from '../../components/Ham2kListItem'
import { Ham2kListSection } from '../../components/Ham2kListSection'

export default function BandModeSettingsScreen ({ navigation }) {
  const dispatch = useDispatch()

  const settings = useSelector(selectSettings)

  const setBand = useCallback((band, value) => {
    let newBands

    if (value) {
      newBands = [...settings.bands, band]
    } else {
      newBands = settings.bands.filter(item => item !== band)
    }

    newBands = newBands.filter(b => BANDS.includes(b))
    newBands.sort((a, b) => BANDS.indexOf(a) - BANDS.indexOf(b))
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
      return BANDS
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
      <ScrollView style={{ flex: 1 }}>
        <Ham2kListSection title={'Bands'}>
          {bandOptions.map((band) => (
            <Ham2kListItem
              key={band}
              title={band}
              right={() => <Switch value={settings.bands.includes(band)} onValueChange={(value) => setBand(band, value)} />}
              onPress={() => setBand(band, !settings.bands.includes(band))}
            />
          ))}
          <Ham2kListItem
            title={moreBands ? 'Show common bands' : 'Show all bands'}
            onPress={() => setMoreBands(!moreBands)}
          />
        </Ham2kListSection>

        <Ham2kListSection title={'Modes'}>
          {modeOptions.map((mode) => (
            <Ham2kListItem
              key={mode}
              title={mode}
              right={() => <Switch value={settings.modes.includes(mode)} onValueChange={(value) => setMode(mode, value)} />}
              onPress={() => setMode(mode, !settings.modes.includes(mode))}
            />
          ))}
          <Ham2kListItem
            title={{ 0: 'Show more modes', 1: 'Show even more modes', 2: 'Show fewer modes' }[moreModes] ?? 'Show more modes'}
            onPress={() => setMoreModes(moreModes + 1 % 3)}
          />
        </Ham2kListSection>
      </ScrollView>
    </ScreenContainer>
  )
}
