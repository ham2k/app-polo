import { registerDataFile } from '../store/dataFiles'

import RNFetchBlob from 'react-native-blob-util'

import packageJson from '../../package.json'
import { analyzeFromCountryFile, parseCountryFile, setCountryFileData, useBuiltinCountryFile } from '@ham2k/lib-country-files'

export const CountryFiles = { }

/*
https://www.country-files.com/bigcty/cty.dat
https://www.country-files.com/bigcty/cty.csv
https://www.country-files.com/bigcty/download/bigcty.zip
 */

export function prepareCountryFilesData () {
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useBuiltinCountryFile()
  // This function is not a hook, it's just named like one

  registerDataFile({
    key: 'country-files-bigcty',
    name: 'Country Files - Big CTY',
    description: 'Helps match callsigns to entities and zones',
    infoURL: 'https://www.country-files.com/bigcty',
    autoLoad: true,
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
      Object.assign(CountryFiles, data)

      setCountryFileData(CountryFiles)
    }
  })
}
