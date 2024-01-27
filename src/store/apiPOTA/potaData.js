import { fmtDateNice } from '../../tools/timeFormats'
import { registerDataFile } from '../dataFiles'
import { readRemoteFile, readString } from 'react-native-csv'

export const POTAAllParks = { byReference: {}, prefixByADIFCode: {} }
export function preparePOTAAllParksData () {
  console.log('POTA Data')
  registerDataFile({
    key: 'pota-all-parks',
    name: 'POTA - All Parks',
    maxAgeInDays: 7,
    autoLoad: true,
    fetch: async () => {
      const url = 'https://sdelmont.s3.amazonaws.com/all_parks_ext.csv' // 'https://pota.app/all_parks_ext.csv'
      // const url = 'https://sdelmont.s3.amazonaws.com/pota-all-parks.json'
      console.log('Fetching POTA Data')
      const response = await fetch(url)
      console.log('Fetching body POTA Data')
      const data = await response.text()
      // console.log('Parsing POTA Data', Object.keys(data))
      // const body = await response.text()
      console.log('Parsing POTA Data', data.substring(0, 100))

      // const parks = []
      // await readString(body, {
      //   header: true,
      //   step: (row) => {
      //     parks.push({
      //       ref: row.reference,
      //       adifCode: row.entityId,
      //       name: row.name,
      //       active: row.active,
      //       grid: row.grid,
      //       lat: row.latitude,
      //       lon: row.longitude
      //     })
      //   }
      // })
      // console.log('Loaded POTA Data')

      // const data = {
      //   byReference: parks.reduce((obj, item) => Object.assign(obj, { [item.ref]: item }), {}),
      //   prefixByADIFCode: parks.reduce((obj, item) => {
      //     if (!obj[item.adifCode]) obj[item.adifCode] = item.ref.split('-')[0]
      //     return obj
      //   }, {})
      // }
      return {
        version: fmtDateNice(new Date()),
        data
      }
    },
    onLoad: (data) => {
      console.log('POTA Loaded')

      Object.assign(POTAAllParks, data)
    }
  })
}
