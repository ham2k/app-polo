import { addRuntimeMessage } from '../store/runtime'
import { activateEnabledExtensions, registerExtension } from './registry'

import CountryFilesExtension from './core/countryFiles'
import POTAExtension from './activities/pota/POTAExtension'
import SOTAExtension from './activities/sota/SOTAExtension'
import WWFFExtension from './activities/wwff/WWFFExtension'
import FDExtension from './activities/fd/FDExtension'
import WFDExtension from './activities/wfd/WFDExtension'
import SEQPExtension from './activities/seqp/SEQPExtension'
import CustomExtension from './activities/custom/CustomExtension'

import RadioCommands from './commands/RadioCommands'
import TimeCommands from './commands/TimeCommands'
import DevModeCommands from './commands/DevModeCommands'
import CallNotesExtension from './data/call-notes/CallNotesExtension'

const loadExtensions = () => async (dispatch, getState) => {
  dispatch(addRuntimeMessage('Loading extensions'))
  registerExtension(CountryFilesExtension)
  registerExtension(POTAExtension)
  registerExtension(SOTAExtension)
  registerExtension(WWFFExtension)
  registerExtension(CustomExtension)
  registerExtension(WFDExtension)
  registerExtension(FDExtension)
  registerExtension(SEQPExtension)

  registerExtension(RadioCommands)
  registerExtension(TimeCommands)
  registerExtension(DevModeCommands)

  registerExtension(CallNotesExtension)

  await activateEnabledExtensions(dispatch, getState)
}

export default loadExtensions
