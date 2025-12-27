/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { IconButton } from 'react-native-paper'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function H2kIconButton (props) {
  const styles = useThemedStyles()

  props.size = (props.size ?? 24) * styles.fontScale * styles.fontScaleAdjustment
  // Our component manages size in virtual pixels, but the underlying icons use "font size" units

  return <IconButton {...props} />
}
