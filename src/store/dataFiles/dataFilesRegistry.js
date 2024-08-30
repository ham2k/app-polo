/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { removeDataFile } from './actions/dataFileFS'

const registeredDataFiles = {}

export function registerDataFile (definiton) {
  registeredDataFiles[definiton.key] = definiton
}

export function unRegisterDataFile (key) {
  registeredDataFiles[key]?.onUnload && registeredDataFiles[key]?.onUnload()
  removeDataFile(key)
  delete registeredDataFiles[key]
}

export function getDataFileDefinition (key) {
  return registeredDataFiles[key]
}

export function getDataFileDefinitions () {
  return Object.values(registeredDataFiles)
}
