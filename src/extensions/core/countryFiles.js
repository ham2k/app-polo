/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import { analyzeFromCountryFile, parseCountryFile, setCountryFileData, useBuiltinCountryFile } from '@ham2k/lib-country-files'

import { registerDataFile } from '../../store/dataFiles'
import { fetchAndProcessURL, loadDataFile } from '../../store/dataFiles/actions/dataFileFS'

// eslint-disable-next-line react-hooks/rules-of-hooks
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
  onActivationDispatch: ({ registerHook }) => async (dispatch) => {
    prepareCountryFilesData()

    // Don't `await`, load in the background
    dispatch(loadDataFile('country-files-bigcty'))
  }
}
export default Extension

export function prepareCountryFilesData () {
  registerDataFile({
    key: 'country-files-bigcty',
    name: 'Data: Country Files - Big CTY',
    description: 'Helps match callsigns to entities and zones',
    infoURL: 'https://www.country-files.com/bigcty',
    alwaysEnabled: true,
    maxAgeInDays: 14,
    fetch: async () => {
      const url = 'https://www.country-files.com/bigcty/cty.csv'
      return fetchAndProcessURL({
        url,
        process: async (body) => {
          const data = parseCountryFile(body)

          setCountryFileData(data)
          const version = analyzeFromCountryFile({ call: 'VERSION' })

          if (version && version.entityName) data.version = version.entityName

          return data
        }
      })
    },
    onLoad: (data) => {
      if (data.entities) {
        Object.assign(CountryFiles, data)
        setCountryFileData(CountryFiles)
      } else {
        // eslint-disable-next-line react-hooks/rules-of-hooks
        useBuiltinCountryFile()
      }
    }
  })
}
