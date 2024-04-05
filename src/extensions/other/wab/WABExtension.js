import { WABOpSetting } from './components/WABOpSetting'

export const Info = {
  key: 'wab-square',
  name: 'Worked All Britain (WAB)',
  icon: 'map-marker-path',
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
