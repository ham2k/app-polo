/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { addRuntimeMessage } from '../store/runtime'
import { activateEnabledExtensions, registerExtension } from './registry'

import CountryFilesExtension from './core/countryFiles'
import DevModeExtension from './core/devMode'
import ADIFExtension from './core/adif'
import POTAExtension from './activities/pota/POTAExtension'
import SOTAExtension from './activities/sota/SOTAExtension'
import GMAExtension from './activities/gma/GMAExtension'
import MOTAExtension from './activities/mota/MOTAExtension'
import WWFFExtension from './activities/wwff/WWFFExtension'
import FDExtension from './activities/fd/FDExtension'
import WFDExtension from './activities/wfd/WFDExtension'
import CustomExtension from './activities/custom/CustomExtension'
import WWBOTAExtension from './activities/wwbota/WWBOTAExtension'
import BCAExtension from './activities/bca/BCAExtension'
import ECAExtension from './activities/eca/ECAExtension'
import ELAExtension from './activities/ela/ELAExtension'
import BLHAExtension from './activities/blha/BLHAExtension'
import SiOTAExtentsion from './activities/siota/SiOTAExtension'

import CallNotesExtension from './data/call-notes/CallNotesExtension'
import CallHistoryExtension from './data/call-history/CallHistoryExtension'
import QRZExtension from './data/qrz/QRZExtension'
import HamDBExtension from './data/hamdb/HamDBExtension'
import HamQTHExtension from './data/hamqth/HamQTHExtension'
import Ham2KLoFiSyncExtension from './data/ham2k-lofi-sync/Ham2KLoFiSyncExtension'
import SpotHistoryExtension from './data/spot-history/SpotHistoryExtension'
import SpotDiscordExtension from './data/spot-discord/SpotDiscordExtension'
import QSOPartiesExtension from './contests/qp/QSOPartiesExtension'
import SimpleContestExtension from './contests/simple-contest/SimpleContestExtension'
import GAPOTAExtension from './contests/gapota/GAPOTAExtension'

import RadioCommands from './commands/RadioCommands'
import TimeCommands from './commands/TimeCommands'
import DebuggingCommands from './commands/DebuggingCommands'
import OperatorCommands from './commands/OperatorCommands'
import MiscCommands from './commands/MiscCommands'

import SatellitesExtension from './activities/satellites/SatellitesExtension'
import WABExtension from './other/wab/WABExtension'

export const loadEarlyExtensions = () => async (dispatch, getState) => {
  registerExtension(DevModeExtension)
  registerExtension(Ham2KLoFiSyncExtension)
  await activateEnabledExtensions(dispatch, getState)
}

export const loadExtensions = () => async (dispatch, getState) => {
  dispatch(addRuntimeMessage('Loading extensions'))
  registerExtension(ADIFExtension)
  registerExtension(CountryFilesExtension)
  registerExtension(POTAExtension)
  registerExtension(SOTAExtension)
  registerExtension(GMAExtension)
  registerExtension(MOTAExtension)
  registerExtension(WWFFExtension)
  registerExtension(CustomExtension)
  registerExtension(WFDExtension)
  registerExtension(FDExtension)
  registerExtension(WWBOTAExtension)
  registerExtension(BCAExtension)
  registerExtension(ECAExtension)
  registerExtension(ELAExtension)
  registerExtension(BLHAExtension)
  registerExtension(SiOTAExtentsion)

  registerExtension(QSOPartiesExtension)
  registerExtension(SimpleContestExtension)
  registerExtension(GAPOTAExtension)
  registerExtension(RadioCommands)
  registerExtension(TimeCommands)
  registerExtension(DebuggingCommands)
  registerExtension(OperatorCommands)
  registerExtension(MiscCommands)

  registerExtension(CallNotesExtension)
  registerExtension(CallHistoryExtension)
  registerExtension(SpotHistoryExtension)
  registerExtension(SpotDiscordExtension)

  registerExtension(QRZExtension)
  registerExtension(HamDBExtension)
  registerExtension(HamQTHExtension)

  registerExtension(SatellitesExtension)

  registerExtension(WABExtension)

  await activateEnabledExtensions(dispatch, getState)
}

export default loadExtensions
