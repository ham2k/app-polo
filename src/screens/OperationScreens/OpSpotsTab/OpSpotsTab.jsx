/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { useSelector } from 'react-redux'
import { selectQSOs } from '../../../store/qsos'
import SpotsPanel from './components/SpotsPanel'

export default function OpSpotsTab ({ navigation, route }) {
  const operation = route.params.operation
  const qsos = useSelector(state => selectQSOs(state, route.params.operation.uuid))

  const handleSelect = useCallback(({ spot }) => {
    if (spot._ourSpot) return

    if (route?.params?.splitView) {
      navigation.navigate('Operation', { ...route?.params, qso: { ...spot, our: undefined, originalKey: spot.key, key: undefined } })
    } else {
      navigation.navigate('OpLog', { qso: { ...spot, our: undefined, originalKey: spot.key, key: undefined } })
    }
  }, [navigation, route?.params])

  return (
    <SpotsPanel operation={operation} qsos={qsos} onSelect={handleSelect} />
  )
}
