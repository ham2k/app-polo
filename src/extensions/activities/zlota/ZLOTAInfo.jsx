/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */
import AwesomeIcon from 'react-native-vector-icons/FontAwesome6'

export const Info = {
  key: 'zlota',
  icon: (props) => <AwesomeIcon name={'kiwi-bird'} solid {...props} />,
  name: 'ZL on the Air',
  shortName: 'ZLOTA',
  doubleContact: 'ZL-to-ZL',
  shortNameDoubleContact: 'ZL2ZL',
  infoURL: 'https://ontheair.nz',
  huntingType: 'zlota',
  activationType: 'zlotaActivation',
  descriptionPlaceholder: 'Enter ZLOTA references',
  unknownReferenceName: 'Unknown ZLOTA reference',
  referenceRegex: /^ZL(?:B\/[0-9]{3}|[HI]\/[A-Z]{2}-[0-9]{3}|L\/[0-9]{4}|P\/[A-Z]{2}-[0-9]{4}|V\/[A-Z]{2,3}-[0-9]{3})$/i
}
