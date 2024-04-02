import RNFetchBlob from 'react-native-blob-util'

import packageJson from '../../../../package.json'

import { fmtDateNice } from '../../../tools/timeFormats'
import { registerDataFile } from '../../../store/dataFiles'

export const POTAAllParks = { byReference: {}, prefixByDXCCCode: {}, activeParks: [] }

export function registerPOTAAllParksData () {
  registerDataFile({
    key: 'pota-all-parks',
    name: 'POTA - All Parks',
    description: 'Database of all POTA references',
    infoURL: 'https://pota.app/',
    icon: 'file-powerpoint-outline',
    maxAgeInDays: 7,
    enabledByDefault: true,
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
          shortName: abbreviatePOTAName(row.name),
          active: row.active === '1',
          grid: row.grid,
          lat: Number.parseFloat(row.latitude),
          lon: Number.parseFloat(row.longitude)
        })
      })

      const activeParks = parks.filter(park => park.active)

      const data = {
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
      POTAAllParks.activeParks = data.activeParks ?? []
      POTAAllParks.prefixByDXCCCode = data.prefixByDXCCCode ?? {}
      POTAAllParks.version = data.version

      POTAAllParks.byReference = POTAAllParks.activeParks.reduce((obj, item) => Object.assign(obj, { [item.ref]: item }), {})
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

const ABBREVIATIONS = [
  ['National Historical Park', 'NHP'],
  ['National Historical Site', 'NHS'],
  ['National Heritage Area', 'NHA'],
  ['National Park', 'NP'],
  ['National Preserve', 'NPr'],
  ['National Monument', 'NMo'],
  ['National Seashore', 'NSs'],
  ['National Scenic River', 'NSRv'],
  ['National Scenic Trail', 'NSTr'],
  ['National Nature Reserve', 'NNRe'],
  ['Wild and Scenic River', 'WSRv'],
  ['State Conservation Area', 'SCA'],
  ['State Historic Site', 'SHS'],
  ['State Game Land', 'SGL'],
  ['State Park', 'SP'],
  ['State Preserve', 'SPr'],
  ['State Forest', 'SF'],
  ['Wildlife Management Area', 'WMA'],
  ['Conservation Area', 'CA'],
  ['Management Area', 'MgA'],
  ['Recreation Park', 'RP'],
  ['Country Park', 'CP'],
  ['Natura 2000', 'N2K']
]

export function abbreviatePOTAName (name) {
  for (const [long, short] of ABBREVIATIONS) {
    name = name?.replace(long, short)
  }
  return name
}
