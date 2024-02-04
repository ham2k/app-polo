import { fmtDateNice } from '../../tools/timeFormats'
import { registerDataFile } from '../dataFiles'

import RNFetchBlob from 'react-native-blob-util'

export const POTAAllParks = { byReference: {}, prefixByDXCCCode: {} }
export function preparePOTAAllParksData () {
  console.log('POTA Data')
  registerDataFile({
    key: 'pota-all-parks',
    name: 'POTA - All Parks',
    maxAgeInDays: 7,
    autoLoad: true,
    fetch: async () => {
      // const url = 'https://sdelmont.s3.amazonaws.com/all_parks_ext.csv' //
      const url = 'https://pota.app/all_parks_ext.csv'

      console.log('Fetching POTA Data')
      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url)
      console.log('Fetching body POTA Data', response.data)
      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')
      console.log('Parsing POTA Data', body.substring(0, 200))

      const parks = []
      const lines = body.split('\n')
      console.log('-- lines', lines.length)
      const headers = parsePOTACSVRow(lines.shift())
      lines.forEach(line => {
        const row = parsePOTACSVRow(line, { headers })
        if (parks.length % 1000 === 0) console.log('-- row', parks.length, row.reference)
        if (parks.length === 0) console.log('CSV Row', row)
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

      console.log('Loaded POTA Data')

      const activeParks = parks.filter(park => park.active)

      const data = {
        byReference: activeParks.reduce((obj, item) => Object.assign(obj, { [item.ref]: item }), {}),
        prefixByDXCCCode: parks.reduce((obj, item) => {
          // if (!obj[item.dxccCode]) {
          //   console.log('DXCC Code', { code: item.dxccCode, ref: item.ref, prefix: item.ref && item.ref.split('-')[0] })
          // }
          if (!obj[item.dxccCode]) obj[item.dxccCode] = item.ref && item.ref.split('-')[0]
          return obj
        }, {}),
        version: fmtDateNice(new Date())
      }

      return data
    },
    onLoad: (data) => {
      console.log('POTA Loaded', data.prefixByDXCCCode)

      Object.assign(POTAAllParks, data)
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
