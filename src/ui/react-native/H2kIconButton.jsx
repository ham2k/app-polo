// Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { IconButton } from 'react-native-paper'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function H2kIconButton (props) {
  const styles = useThemedStyles()

  props.size = (props.size ?? 24) * styles.fontScale * styles.fontScaleAdjustment
  // Our component manages size in virtual pixels, but the underlying icons use "font size" units

  return <IconButton {...props} />
}
