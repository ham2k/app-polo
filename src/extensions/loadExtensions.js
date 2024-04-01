import { addRuntimeMessage } from '../store/runtime'
import { activateEnabledExtensions, registerExtension } from './registry'

import CountryFilesExtension from './core/countryFiles'
import POTAExtension from './activities/pota/POTAExtension'
import SOTAExtension from './activities/sota/SOTAExtension'
import WWFFExtension from './activities/wwff/WWFFExtension'
import FDExtension from './activities/fd/FDExtension'
import WFDExtension from './activities/wfd/WFDExtension'

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
