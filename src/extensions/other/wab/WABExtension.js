// Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { WABOpSetting } from './components/WABOpSetting'

export const Info = {
  key: 'wab-square',
  name: 'Worked All Britain/Ireland',
  icon: 'selection-marker',
  description: 'Add WAB/WAI Square to operation'
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
