import { addRuntimeMessage } from '../store/runtime'
import { activateExtension, registerExtension } from './registry'

import POTAExtension from './pota/POTAExtension'
import SOTAExtension from './sota/SOTAExtension'

const loadExtensions = () => (dispatch, getState) => {
  dispatch(addRuntimeMessage('Loading extensions'))
  registerExtension(POTAExtension)
  registerExtension(SOTAExtension)

  activateExtension(POTAExtension)
  activateExtension(SOTAExtension)
}

export default loadExtensions
