/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Icon as PaperIcon } from 'react-native-paper'
import FontAwesome6Icon from "@react-native-vector-icons/fontawesome6"

export function H2kIcon({ ...props }) {
  const name = props.name ?? props.source ?? props.icon

  if (name?.startsWith && name.startsWith('fa-')) {
    return <FontAwesome6Icon {...props} name={name.slice(3)} iconStyle="solid" size={props.size ? props.size * 0.75 : undefined} />
  } else {
    return <PaperIcon source={name} {...props} />
  }
}

export function paperNameOrHam2KIcon(name, ...args) {
  if (name?.startsWith && name.startsWith('fa-')) {
    return (props) => <FontAwesome6Icon {...args} {...props} name={name.slice(3)} iconStyle="solid" size={props.size ? props.size * 0.75 : undefined} />
  } else {
    return name
  }
}
