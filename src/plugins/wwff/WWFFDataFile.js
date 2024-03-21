import { fmtDateNice } from '../../tools/timeFormats'
import { registerDataFile } from '../../store/dataFiles'

import RNFetchBlob from 'react-native-blob-util'

import packageJson from '../../../package.json'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

export const WWFFData = { byReference: {}, prefixByDXCCCode: {} }

export function registerWWFFDataFile () {
  registerDataFile({
    key: 'wwff-all-parks',
    name: 'WWFF - All Parks',
    description: 'Database of all WWFF references',
    infoURL: 'https://wwff.co/directory/',
    icon: 'file-word-outline',
    maxAgeInDays: 7,
    autoLoad: true,
    fetch: async () => {
      const url = 'https://wwff.co/wwff-data/wwff_directory.csv'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      const references = []
      const lines = body.split('\n')
      const headers = parseWWFFCSVRow(lines.shift()).filter(x => x)

      lines.forEach(line => {
        const row = parseWWFFCSVRow(line, { headers })
        const lat = Number.parseFloat(row.latitude)
        const lon = Number.parseFloat(row.longitude)
        const grid = !row.iaruLocator ? locationToGrid6(lat, lon) : row.iaruLocator.replace(/[A-Z]{2}$/, x => x.toLowerCase())
        references.push({
          ref: row.reference.toUpperCase(),
          dxccCode: Number.parseInt(row.dxccEnum, 10),
          name: row.name,
          active: row.status === 'active',
          grid,
          lat,
          lon
        })
      })

      const activeReferences = references.filter(ref => ref.active)

      const data = {
        activeReferences,
        prefixByDXCCCode: references.reduce((obj, item) => {
          if (!obj[item.dxccCode]) obj[item.dxccCode] = item.ref && item.ref.split('-')[0]
          return obj
        }, {}),
        version: fmtDateNice(new Date())
      }

      RNFetchBlob.fs.unlink(response.data)

      return data
    },
    onLoad: (data) => {
      WWFFData.activeReferences = data.activeReferences ?? []
      WWFFData.version = data.version
      WWFFData.prefixByDXCCCode = data.prefixByDXCCCode
      WWFFData.byReference = WWFFData.activeReferences.reduce((obj, item) => Object.assign(obj, { [item.ref]: item }), {})
    }
  })
}

const CSV_ROW_REGEX = /(?:"((?:[^"]|"")*)"|([^",]*))(?:,|\s*$)/g
// (?:              # Start of non-capturing group for each column
//   "((?:[^"]|"")*)" #   Match a quoted string, capturing the contents
//   |              #   Or
//   ([^",]*)         #   Match an unquoted string
// )                # End of non-capturing group for each column
// (?:,|\s*$)       # Match either a comma or the end of the line

function parseWWFFCSVRow (row, options) {
  const parts = [...row.matchAll(CSV_ROW_REGEX)].map(match => match[1]?.replaceAll('""', '"') ?? match[2] ?? '')

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
