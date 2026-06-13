// Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { Icon as PaperIcon } from 'react-native-paper'
import FontAwesomeIcon from '@react-native-vector-icons/fontawesome6'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function H2kIcon ({ ...props }) {
  const styles = useThemedStyles()

  const name = props.name ?? props.source ?? props.icon

  if (props.size) {
    props.size = props.size * styles.fontScale * styles.fontScaleAdjustment
  }
  // Our component manages size in virtual pixels, but the underlying icons use "font size" units

  if (name?.startsWith && name.startsWith('fa-')) {
    // default to onSurface if no color is provided, same as PaperIcon
    const color = props.color || styles.colors.onSurface
    return <FontAwesomeIcon {...props} name={name.slice(3)} iconStyle="solid" color={color} />
  } else {
    return <PaperIcon source={name} {...props} />
  }
}
