import { addRuntimeMessage } from '../store/runtime'
import { activateExtension, registerExtension } from './registry'

import POTAExtension from './pota/POTAExtension'
import SOTAExtension from './sota/SOTAExtension'
import FDExtension from './sota/FDExtension'
import WFDExtension from './sota/WFDExtension'

const loadExtensions = () => (dispatch, getState) => {
  dispatch(addRuntimeMessage('Loading extensions'))
  registerExtension(POTAExtension)
  registerExtension(SOTAExtension)
  registerExtension(WFDExtension)
  registerExtension(FDExtension)

  activateExtension(POTAExtension)
  activateExtension(SOTAExtension)
  activateExtension(FDExtension)
  activateExtension(WFDExtension)
}

export default loadExtensions
