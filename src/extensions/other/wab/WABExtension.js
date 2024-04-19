/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { WABOpSetting } from './components/WABOpSetting'

export const Info = {
  key: 'wab-square',
  name: 'Worked All Britain (WAB)',
  icon: 'selection-marker',
  description: 'Add WAB Square to operation'
}

const Extension = {
  ...Info,
  category: 'other',
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    registerHook('opSetting', {
      hook: {
        key: 'wab-square-selector',
        category: 'detail',
        OpSettingItem: WABOpSetting
      }
    })
  }
}

export default Extension
