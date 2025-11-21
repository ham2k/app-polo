/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Icon as PaperIcon } from 'react-native-paper'
import FontAwesome6Icon from '@react-native-vector-icons/fontawesome6'
import { useThemedStyles } from '../../styles/tools/useThemedStyles'

export function H2kIcon ({ ...props }) {
  const styles = useThemedStyles()

  const name = props.name ?? props.source ?? props.icon
  const size = props.size ? props.size * styles.fontScale : styles.oneSpace * 2.8

  if (name?.startsWith && name.startsWith('fa-')) {
    return <FontAwesome6Icon {...props} size={size} name={name.slice(3)} iconStyle="solid" />
  } else {
    return <PaperIcon source={name} {...props} size={size} />
  }
}

export function paperNameOrHam2KIcon (name, ...args) {
  if (name?.startsWith && name.startsWith('fa-')) {
    return (props) => <FontAwesome6Icon {...args} {...props} name={name.slice(3)} iconStyle="solid" />
  } else {
    return name
  }
}
