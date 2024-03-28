import RNFetchBlob from 'react-native-blob-util'

import { analyzeFromCountryFile, parseCountryFile, setCountryFileData, useBuiltinCountryFile } from '@ham2k/lib-country-files'

import packageJson from '../../../package.json'
import { registerDataFile } from '../../store/dataFiles'
import { loadDataFile } from '../../store/dataFiles/actions/dataFileFS'

useBuiltinCountryFile()

export const CountryFiles = { }

/*
https://www.country-files.com/bigcty/cty.dat
https://www.country-files.com/bigcty/cty.csv
https://www.country-files.com/bigcty/download/bigcty.zip
 */

const Extension = {
  key: 'core-countryFiles',
  name: 'Core Country Files Data',
  category: 'core',
  hidden: true,
  alwaysEnabled: true,
  onActivationDispatch: ({ registerHook, registerHandler }) => async (dispatch) => {
    prepareCountryFilesData()
    await dispatch(loadDataFile('country-files-bigcty'))
  }
}
export default Extension


export function prepareCountryFilesData () {
  registerDataFile({
    key: 'country-files-bigcty',
    name: 'Country Files - Big CTY',
    description: 'Helps match callsigns to entities and zones',
    infoURL: 'https://www.country-files.com/bigcty',
    alwaysEnabled: true,
    fetch: async () => {
      const request = 'https://www.country-files.com/bigcty/cty.csv'
      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', request, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })

      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      const data = parseCountryFile(body)

      RNFetchBlob.fs.unlink(response.data)

      setCountryFileData(data)
      const version = analyzeFromCountryFile({ call: 'VERSION' })

      if (version && version.entityName) data.version = version.entityName

      return data
    },
    onLoad: (data) => {
      if (data.entities) {
        Object.assign(CountryFiles, data)
        setCountryFileData(CountryFiles)
      } else {
        useBuiltinCountryFile()
      }
    }
  })
}
