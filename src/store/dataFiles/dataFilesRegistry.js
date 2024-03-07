const registeredDataFiles = {}

export function registerDataFile (definiton) {
  // console.log('Registered data file', definiton.key)
  registeredDataFiles[definiton.key] = definiton
}

export function getDataFileDefinition (key) {
  return registeredDataFiles[key]
}

export function getDataFileDefinitions () {
  return Object.values(registeredDataFiles)
}
