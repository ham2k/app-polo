/* eslint-disable react/no-unstable-nested-components */
import React, { useCallback, useEffect, useMemo } from 'react'
import { List, Switch } from 'react-native-paper'
import { ScrollView } from 'react-native'

import ScreenContainer from '../../components/ScreenContainer'
import { useDispatch, useSelector } from 'react-redux'
import { selectSettings, setSettings } from '../../../store/settings'
import { ADIF_MODES_AND_SUBMODES, BANDS, MAIN_MODES, POPULAR_BANDS, POPULAR_MODES } from '@ham2k/lib-operation-data'
import { useUIState } from '../../../store/ui'

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

  const [moreBands, setMoreBands] = useUIState('BandModeSettingsScreen', 'moreBands', !!(settings.bands ?? []).find(band => !POPULAR_BANDS.includes(band)))

  const bandOptions = useMemo(() => {
    if (moreBands || (settings.bands ?? []).find(band => !POPULAR_BANDS.includes(band))) {
      return BANDS
    } else {
      return POPULAR_BANDS
    }
  }, [moreBands, settings?.bands])

  const [moreModes, setMoreModes] = useUIState('BandModeSettingsScreen', 'moreModes', undefined)

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
  }, [moreModes, setMoreModes, settings.modes])

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
        <List.Section>
          <List.Subheader>Bands</List.Subheader>
          {bandOptions.map((band) => (
            <List.Item
              key={band}
              title={band}
              right={() => <Switch value={settings.bands.includes(band)} onValueChange={(value) => setBand(band, value)} />}
              onPress={() => setBand(band, !settings.bands.includes(band))}
            />
          ))}
          <List.Item
            title={moreBands ? 'Show common bands' : 'Show all bands'}
            onPress={() => setMoreBands(!moreBands)}
          />
        </List.Section>

        <List.Section>
          <List.Subheader>Modes</List.Subheader>
          {modeOptions.map((mode) => (
            <List.Item
              key={mode}
              title={mode}
              right={() => <Switch value={settings.modes.includes(mode)} onValueChange={(value) => setMode(mode, value)} />}
              onPress={() => setMode(mode, !settings.modes.includes(mode))}
            />
          ))}
          <List.Item
            title={{ 0: 'Show more modes', 1: 'Show even more modes', 2: 'Show fewer modes' }[moreModes] ?? 'Show more modes'}
            onPress={() => setMoreModes(moreModes + 1 % 3)}
          />
        </List.Section>
      </ScrollView>
    </ScreenContainer>
  )
}
