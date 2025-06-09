/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useFindHooks } from '../../../extensions/registry'
import { selectRuntimeOnline } from '../../../store/runtime'
import { selectSettings } from '../../../store/settings'
import { selectQSOs } from '../../../store/qsos'

import SpotsPanel from './components/SpotsPanel'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export default function OpSpotsTab ({ navigation, route }) {
  const dispatch = useDispatch()
  const safeArea = useSafeAreaInsets()

  const operation = route.params.operation
  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))
  const settings = useSelector(selectSettings)
  const online = useSelector(selectRuntimeOnline)

  const spotsHooks = useFindHooks('spots')

  const extraSpotInfoHooks = useMemo(() => spotsHooks.filter(hook => hook?.extraSpotInfo), [spotsHooks])

  const handleSelect = useCallback(async ({ spot }) => {
    if (spot._ourSpot) return

    for (const hook of extraSpotInfoHooks) {
      await hook.extraSpotInfo({ online, settings, dispatch, spot })
    }

    if (route?.params?.splitView) {
      navigation.navigate('Operation', { ...route?.params, qso: { ...spot, our: undefined, _suggestedKey: spot.key, key: undefined } })
    } else {
      navigation.navigate('OpLog', { qso: { ...spot, our: undefined, _suggestedKey: spot.key, key: undefined } })
    }
  }, [navigation, route?.params, extraSpotInfoHooks, dispatch, online, settings])

  return (
    <SpotsPanel operation={operation} qsos={qsos} onSelect={handleSelect} style={{ paddingBottom: safeArea.bottom, paddingRight: safeArea.right }} />
  )
}
