import { addRuntimeMessage } from '../store/runtime'
import POTAExtension from './pota/POTAExtension'
import { activateExtension, registerExtension } from './registry'

const loadExtensions = () => (dispatch, getState) => {
  dispatch(addRuntimeMessage('Loading extensions'))
  registerExtension(POTAExtension)
  activateExtension(POTAExtension)
}

export default loadExtensions
