/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { Alert } from 'react-native'

import { filterRefs } from '../../../tools/refTools'
import { GMACommonPostSelfSpot } from '../gma/GMACommonPostSelfSpot'
import { reportError } from '../../../distro'

export const WWFFPostSpot = ({ operation, vfo, comments }) => async (dispatch, getState) => {
  const refs = filterRefs(operation, 'wwffActivation')
  try {
    if (refs.length) {
      return dispatch(GMACommonPostSelfSpot({ operation, vfo, comments, refs, url: 'https://www.cqgma.org/wwff/spotwwff.php' }))
    }
  } catch (error) {
    Alert.alert('Error posting WWFF spot', error.message)
    reportError('Error posting WWFF spot', error)
  }
}
