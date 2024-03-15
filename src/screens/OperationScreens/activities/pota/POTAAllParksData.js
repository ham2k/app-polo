import { fmtDateNice } from '../../../../tools/timeFormats'
import { registerDataFile } from '../../../../store/dataFiles'

import RNFetchBlob from 'react-native-blob-util'

import packageJson from '../../../../../package.json'

export const POTAAllParks = { byReference: {}, prefixByDXCCCode: {} }

export function registerPOTAAllParksData () {
  registerDataFile({
    key: 'pota-all-parks',
    name: 'POTA - All Parks',
    description: 'Database of all POTA references',
    infoURL: 'https://pota.app/',
    icon: 'file-powerpoint-outline',
    // TODO: Change maxAgeInDays to 7 after mid-May 2024
    maxAgeInDays: 1,
    autoLoad: true,
    fetch: async () => {
      const url = 'https://pota.app/all_parks_ext.csv'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      const parks = []
      const lines = body.split('\n')
      const headers = parsePOTACSVRow(lines.shift())
      lines.forEach(line => {
        const row = parsePOTACSVRow(line, { headers })
        parks.push({
          ref: row.reference,
          dxccCode: Number.parseInt(row.entityId, 10),
          name: row.name,
          active: row.active === '1',
          grid: row.grid,
          lat: Number.parseFloat(row.latitude),
          lon: Number.parseFloat(row.longitude)
        })
      })

      const activeParks = parks.filter(park => park.active)

      const data = {
        byReference: activeParks.reduce((obj, item) => Object.assign(obj, { [item.ref]: item }), {}),
        activeParks,
        prefixByDXCCCode: parks.reduce((obj, item) => {
          if (!obj[item.dxccCode]) obj[item.dxccCode] = item.ref && item.ref.split('-')[0]
          return obj
        }, {}),
        version: fmtDateNice(new Date())
      }

      RNFetchBlob.fs.unlink(response.data)

      return data
    },
    onLoad: (data) => {
      Object.assign(POTAAllParks, data)

      // TODO: Remove this line after April 2024
      if (!POTAAllParks.activeParks) POTAAllParks.activeParks = Object.values(POTAAllParks.byReference)
    }
  })
}

const QUOTED_CSV_ROW_REGEX = /"(([^"]|"")*)",{0,1}/g
function parsePOTACSVRow (row, options) {
  const parts = [...row.matchAll(QUOTED_CSV_ROW_REGEX)].map(match => match[1].replaceAll('""', '"'))

  if (options?.headers) {
    const obj = {}
    options.headers.forEach((column, index) => {
      obj[column] = parts[index]
    })
    return obj
  } else {
    return parts
  }
}
