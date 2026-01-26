/*
 * Copyright ©️ 2024-2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { addRuntimeMessage } from '../store/runtime'
import { activateEnabledExtensions, registerExtension } from './registry'

import CountryFilesExtension from './core/countryFiles'
import DevModeExtension from './core/devMode'
import ADIFExtension from './core/adif'

import BLHAExtension from './activities/blha/BLHAExtension'
import CustomExtension from './activities/custom/CustomExtension'
import ELAExtension from './activities/ela/ELAExtension'
import FDExtension from './activities/fd/FDExtension'
import GMAExtension from './activities/gma/GMAExtension'
import LLOTAExtension from './activities/llota/LLOTAExtension'
import MOTAExtension from './activities/mota/MOTAExtension'
import PGAExtentsion from './activities/pga/PGAExtension'
import POTAExtension from './activities/pota/POTAExtension'
import SatellitesExtension from './activities/satellites/SatellitesExtension'
import SiOTAExtentsion from './activities/siota/SiOTAExtension'
import SOTAExtension from './activities/sota/SOTAExtension'
import TOTAExtension from './activities/tota/TOTAExtension'
import ThirteenColoniesExtension from './activities/colonies/ThirteenColoniesExtension'
import WCAExtension from './activities/wca/WCAExtension'
import WFDExtension from './activities/wfd/WFDExtension'
import WWBOTAExtension from './activities/wwbota/WWBOTAExtension'
import WWFFExtension from './activities/wwff/WWFFExtension'
import ZLOTAExtension from './activities/zlota/ZLOTAExtension'

import CallHistoryExtension from './data/call-history/CallHistoryExtension'
import CallNotesExtension from './data/call-notes/CallNotesExtension'
import Ham2KLoFiSyncExtension from './data/ham2k-lofi-sync/Ham2KLoFiSyncExtension'
import HamDBExtension from './data/hamdb/HamDBExtension'
import HamQTHExtension from './data/hamqth/HamQTHExtension'
import QRZExtension from './data/qrz/QRZExtension'
import SpotDiscordExtension from './data/spot-discord/SpotDiscordExtension'
import SpotHistoryExtension from './data/spot-history/SpotHistoryExtension'
import SpotParksnPeaksExtension from './data/spot-parksnpeaks/SpotParksnPeaksExtension'

import GAPOTAExtension from './contests/gapota/GAPOTAExtension'
import NAQPExtension from './contests/naqp/NAQPExtension'
import QSOPartiesExtension from './contests/qp/QSOPartiesExtension'
import SimpleContestExtension from './contests/simple-contest/SimpleContestExtension'

import AnnotationCommands from './commands/AnnotationCommands'
import DebuggingCommands from './commands/DebuggingCommands'
import MiscCommands from './commands/MiscCommands'
import OperationCommands from './commands/OperationCommands'
import OperatorCommands from './commands/OperatorCommands'
import RadioCommands from './commands/RadioCommands'
import SettingsCommands from './commands/SettingsCommands'
import TimeCommands from './commands/TimeCommands'

import WABExtension from './other/wab/WABExtension'

import GLOBAL from '../GLOBAL'

export const loadEarlyExtensions = () => async (dispatch, getState) => {
  registerExtension(DevModeExtension)
  registerExtension(Ham2KLoFiSyncExtension)
  await activateEnabledExtensions(dispatch, getState)
}

export const loadExtensions = () => async (dispatch, getState) => {
  dispatch(addRuntimeMessage(GLOBAL.t('screens.start.Loading Extensions', 'Loading Extensions')))
  registerExtension(ADIFExtension)
  registerExtension(CountryFilesExtension)

  // registerExtension(BCAExtension)
  // registerExtension(ECAExtension)
  registerExtension(BLHAExtension)
  registerExtension(CustomExtension)
  registerExtension(ELAExtension)
  registerExtension(FDExtension)
  registerExtension(GMAExtension)
  registerExtension(LLOTAExtension)
  registerExtension(MOTAExtension)
  registerExtension(PGAExtentsion)
  registerExtension(POTAExtension)
  registerExtension(SatellitesExtension)
  registerExtension(SiOTAExtentsion)
  registerExtension(SOTAExtension)
  registerExtension(TOTAExtension)
  registerExtension(ThirteenColoniesExtension)
  registerExtension(WCAExtension)
  registerExtension(WFDExtension)
  registerExtension(WWBOTAExtension)
  registerExtension(WWFFExtension)
  registerExtension(ZLOTAExtension)

  registerExtension(GAPOTAExtension)
  registerExtension(NAQPExtension)
  registerExtension(QSOPartiesExtension)
  registerExtension(SimpleContestExtension)

  registerExtension(AnnotationCommands)
  registerExtension(DebuggingCommands)
  registerExtension(MiscCommands)
  registerExtension(OperationCommands)
  registerExtension(OperatorCommands)
  registerExtension(RadioCommands)
  registerExtension(SettingsCommands)
  registerExtension(TimeCommands)

  registerExtension(CallNotesExtension)
  registerExtension(CallHistoryExtension)
  registerExtension(SpotHistoryExtension)
  registerExtension(SpotDiscordExtension)
  registerExtension(SpotParksnPeaksExtension)

  registerExtension(QRZExtension)
  registerExtension(HamDBExtension)
  registerExtension(HamQTHExtension)

  registerExtension(WABExtension)

  await activateEnabledExtensions(dispatch, getState)
}

export default loadExtensions
