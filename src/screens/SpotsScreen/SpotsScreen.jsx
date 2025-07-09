/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import React, { useCallback } from 'react'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import SpotsPanel from '../OperationScreens/OpSpotsTab/components/SpotsPanel'

export default function SpotsScreen ({ navigation, route }) {
  const safeArea = useSafeAreaInsets()

  const handleSelect = useCallback(({ spot }) => {
    // Do nothing
  }, [])

  return (
    <SpotsPanel operation={{}} qsos={[]} onSelect={handleSelect} style={{ paddingBottom: safeArea.bottom, paddingRight: safeArea.right }} />
  )
}
