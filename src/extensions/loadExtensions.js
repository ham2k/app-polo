import { addRuntimeMessage } from '../store/runtime'
import { activateEnabledExtensions, registerExtension } from './registry'

import CountryFilesExtension from './core/countryFiles'
import POTAExtension from './pota/POTAExtension'
import SOTAExtension from './sota/SOTAExtension'
import WWFFExtension from './wwff/WWFFExtension'
import FDExtension from './fd/FDExtension'
import WFDExtension from './wfd/WFDExtension'

const loadExtensions = () => (dispatch, getState) => {
  dispatch(addRuntimeMessage('Loading extensions'))
  registerExtension(CountryFilesExtension)
  registerExtension(POTAExtension)
  registerExtension(SOTAExtension)
  registerExtension(WWFFExtension)
  registerExtension(WFDExtension)
  registerExtension(FDExtension)

  activateEnabledExtensions(dispatch, getState)
}

export default loadExtensions
