// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

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
