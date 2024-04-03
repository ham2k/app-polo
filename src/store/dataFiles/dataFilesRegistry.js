import { removeDataFile } from './actions/dataFileFS'

const registeredDataFiles = {}

export function registerDataFile (definiton) {
  registeredDataFiles[definiton.key] = definiton
}

export function unRegisterDataFile (definiton) {
  registeredDataFiles[definiton.key]?.onUnload && registeredDataFiles[definiton.key]?.onUnload()
  removeDataFile(definiton.key)
  delete registeredDataFiles[definiton.key]
}

export function getDataFileDefinition (key) {
  return registeredDataFiles[key]
}

export function getDataFileDefinitions () {
  return Object.values(registeredDataFiles)
}
