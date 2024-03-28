const registeredDataFiles = {}

export function registerDataFile (definiton) {
  registeredDataFiles[definiton.key] = definiton
}

export function getDataFileDefinition (key) {
  return registeredDataFiles[key]
}

export function getDataFileDefinitions () {
  return Object.values(registeredDataFiles)
}
