import { fmtDateNice } from '../tools/timeFormats'
import { registerDataFile } from '../store/dataFiles'

import RNFetchBlob from 'react-native-blob-util'

import packageJson from '../../package.json'
import { parseCountryFile, setCountryFileData, useBuiltinCountryFile } from '@ham2k/lib-country-files'

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
    infoURL: 'https://www.country-files.com/bigcty',
    maxAgeInDays: 7,
    autoLoad: true,
    fetch: async () => {
      const request = 'https://www.country-files.com/bigcty/cty.csv'
      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', request, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })

      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      console.log('Country Files', body?.substring(0, 100))

      const data = parseCountryFile(body)

      RNFetchBlob.fs.unlink(response.data)

      return data
    },
    onLoad: (data) => {
      console.log('Country Files data', Object.keys(data))
      Object.assign(CountryFiles, data)
      setCountryFileData(CountryFiles)
    }
  })
}
