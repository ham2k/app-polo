/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { addRuntimeMessage } from '../store/runtime'
import { activateEnabledExtensions, registerExtension } from './registry'

import CountryFilesExtension from './core/countryFiles'
import POTAExtension from './activities/pota/POTAExtension'
import SOTAExtension from './activities/sota/SOTAExtension'
import WWFFExtension from './activities/wwff/WWFFExtension'
import FDExtension from './activities/fd/FDExtension'
import WFDExtension from './activities/wfd/WFDExtension'
import CustomExtension from './activities/custom/CustomExtension'
import UKBOTAExtension from './activities/ukbota/UKBOTAExtension'
import ECAExtension from './activities/eca/ECAExtension'
import ELAExtension from './activities/ela/ELAExtension'

import RadioCommands from './commands/RadioCommands'
import TimeCommands from './commands/TimeCommands'
import DevModeCommands from './commands/DevModeCommands'
import CallNotesExtension from './data/call-notes/CallNotesExtension'

import WABExtension from './other/wab/WABExtension'

const loadExtensions = () => async (dispatch, getState) => {
  dispatch(addRuntimeMessage('Loading extensions'))
  registerExtension(CountryFilesExtension)
  registerExtension(POTAExtension)
  registerExtension(SOTAExtension)
  registerExtension(WWFFExtension)
  registerExtension(CustomExtension)
  registerExtension(WFDExtension)
  registerExtension(FDExtension)
  registerExtension(UKBOTAExtension)
  registerExtension(ECAExtension)
  registerExtension(ELAExtension)

  registerExtension(RadioCommands)
  registerExtension(TimeCommands)
  registerExtension(DevModeCommands)

  registerExtension(CallNotesExtension)

  registerExtension(WABExtension)

  await activateEnabledExtensions(dispatch, getState)
}

export default loadExtensions
