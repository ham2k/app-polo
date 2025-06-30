/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Icon as PaperIcon } from 'react-native-paper'
import AwesomeIcon from 'react-native-vector-icons/FontAwesome6'

export function Ham2KIcon ({ ...props }) {
  const name = props.name ?? props.source ?? props.icon
  console.log('Ham2KIcon', name)
  if (name?.startsWith && name.startsWith('fa-')) {
    console.log('FA Icon', name.slice(3))
    return <AwesomeIcon name={name.slice(3)} solid {...props} />
  } else {
    return <PaperIcon source={name} {...props} />
  }
}

export function paperNameOrHam2KIcon (name, ...args) {
  if (name?.startsWith && name.startsWith('fa-')) {
    return (props) => <AwesomeIcon name={name.slice(3)} solid {...args} {...props} />
  } else {
    return name
  }
}
