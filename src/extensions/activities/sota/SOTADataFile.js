import RNFetchBlob from 'react-native-blob-util'
import { locationToGrid6 } from '@ham2k/lib-maidenhead-grid'

import packageJson from '../../../../package.json'
import { registerDataFile } from '../../../store/dataFiles'

export const SOTAData = { byReference: {}, activeReferences: [], regions: {} }

export function registerSOTADataFile () {
  registerDataFile({
    key: 'sota-all-summits',
    name: 'SOTA - All Summits',
    description: 'Database of all SOTA references',
    infoURL: 'https://www.sotadata.org.uk/en/summits',
    icon: 'file-image-outline',
    maxAgeInDays: 7,
    enabledByDefault: false,
    fetch: async () => {
      const url = 'https://www.sotadata.org.uk/summitslist.csv'

      const response = await RNFetchBlob.config({ fileCache: true }).fetch('GET', url, {
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      })
      const body = await RNFetchBlob.fs.readFile(response.data, 'utf8')

      const references = []
      const regions = {}
      const regionIds = {}

      const lines = body.split('\n')
      const versionRow = lines.shift()
      const headers = parseSOTACSVRow(lines.shift()).filter(x => x)

      lines.forEach(line => {
        const row = parseSOTACSVRow(line, { headers })
        if (row.SummitCode && row.ValidTo === '31/12/2099') {
          const lon = Number.parseFloat(row.Longitude)
          const lat = Number.parseFloat(row.Latitude)
          const ref = {
            ref: row.SummitCode.toUpperCase(),
            grid: locationToGrid6(lat, lon),
            alt: Number.parseInt(row.AltM, 10),
            lat,
            lon
          }
          if (ref.ref !== row.SummitName) ref.name = row.SummitName

          const uc = row.SummitName.toUpperCase()
          if (ref.name !== uc && ref.ref !== uc) ref.uc = uc

          const regStr = [row.RegionName, row.AssociationName].join('-')
          if (regionIds[regStr]) {
            ref.reg = regionIds[regStr]
          } else {
            const regId = Object.keys(regions).length + 1
            regionIds[regStr] = regId
            regions[regId] = { region: row.RegionName, association: row.AssociationName }
            ref.reg = regId
          }

          references.push(ref)
        }
      })

      const activeReferences = references // TODO: Filter out inactive references

      const data = {
        activeReferences,
        regions,
        version: versionRow
      }
      RNFetchBlob.fs.unlink(response.data)

      return data
    },
    onLoad: (data) => {
      if (data.regions) {
        SOTAData.activeReferences = data.activeReferences ?? []
        SOTAData.regions = data.regions
        SOTAData.version = data.version

        SOTAData.byReference = SOTAData.activeReferences.reduce((obj, item) => Object.assign(obj, { [item.ref]: item }), {})
      } else {
        SOTAData.activeReferences = []
        SOTAData.regions = {}
        SOTAData.byReference = {}
        SOTAData.version = null
      }
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

function parseSOTACSVRow (row, options) {
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
