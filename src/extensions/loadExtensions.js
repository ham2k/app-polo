import { addRuntimeMessage } from '../store/runtime'
import { activateExtension, registerExtension } from './registry'

import POTAExtension from './pota/POTAExtension'
import SOTAExtension from './sota/SOTAExtension'
import WWFFExtension from './wwff/WWFFExtension'
import FDExtension from './fd/FDExtension'
import WFDExtension from './wfd/WFDExtension'

const loadExtensions = () => (dispatch, getState) => {
  dispatch(addRuntimeMessage('Loading extensions'))
  registerExtension(POTAExtension)
  registerExtension(SOTAExtension)
  registerExtension(WWFFExtension)
  registerExtension(WFDExtension)
  registerExtension(FDExtension)

  activateExtension(POTAExtension)
  activateExtension(SOTAExtension)
  activateExtension(WWFFExtension)
  activateExtension(FDExtension)
  activateExtension(WFDExtension)
}

export default loadExtensions
