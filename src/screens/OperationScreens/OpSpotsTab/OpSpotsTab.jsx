/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { useFindHooks } from '../../../extensions/registry'
import { selectRuntimeOnline } from '../../../store/runtime'
import { selectSettings } from '../../../store/settings'
import { selectSectionedQSOs } from '../../../store/qsos'
import { selectCatAddress } from '../../../store/station/stationSlice'
import { tuneRadio } from '../../../store/apis/apiSOTAcat/apiSOTAcat'

import SpotsPanel from './components/SpotsPanel'

export default function OpSpotsTab ({ navigation, route }) {
  const dispatch = useDispatch()
  const safeArea = useSafeAreaInsets()

  const settings = useSelector(selectSettings)
  const operation = route.params.operation
  const { sections, qsos } = useSelector(state => selectSectionedQSOs(state, operation?.uuid, settings.showDeletedQSOs !== false))
  const online = useSelector(selectRuntimeOnline)
  const catAddress = useSelector(selectCatAddress)

  const spotsHooks = useFindHooks('spots')

  const extraSpotInfoHooks = useMemo(() => spotsHooks.filter(hook => hook?.extraSpotInfo), [spotsHooks])

  const handleSelect = useCallback(async ({ spot }) => {
    if (spot._ourSpot) return

    for (const hook of extraSpotInfoHooks) {
      await hook.extraSpotInfo({ online, settings, dispatch, spot })
    }

    // Tune SOTAcat radio if connected (fire-and-forget)
    if (catAddress && (spot.freq || spot.mode)) {
      tuneRadio(catAddress, spot.freq, spot.mode).catch(error => {
        console.log('[SOTAcat] Tune error:', error)
      })
    }

    const qso = {
      their: { call: spot.their?.call },
      band: spot.band,
      freq: spot.freq,
      mode: spot.mode,
      refs: [...(spot.refs || [])],
      _suggestedKey: spot.key
    }

    navigation.navigate('Operation', { ...route?.params, qso })
  }, [navigation, route?.params, extraSpotInfoHooks, dispatch, online, settings, catAddress])

  return (
    <SpotsPanel operation={operation} qsos={qsos} sections={sections} onSelect={handleSelect} style={{ paddingBottom: safeArea.bottom, paddingRight: safeArea.right }} />
  )
}
