import packageJson from '../../../../package.json'
import { filterRefs } from '../../../tools/refTools'

const validModes = ['CW', 'FM', 'SSB', 'RTTY', 'PSK']

export const WWFFPostSpot = (operation, comments) => async (dispatch, getState) => {
  const state = getState()
  const call = operation.stationCall || state.settings.operatorCall

  const refs = filterRefs(operation, 'wwffActivation')
  for (const ref of refs) { // Should only be one
    try {
      const response = await fetch('https://www.cqgma.org/wwff/spotwwff.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
        },
        body: new URLSearchParams({
          yspotter: call,
          ycall: call,
          yreference: ref.ref,
          yqrg: operation.freq,
          ymode: validModes.includes(operation.mode) ? operation.mode : 'other',
          ycomment: comments,
          B1: 'Submit'
        }).toString()
      })
      if (response.status === 200) {
        // const body = await response.text()
        // console.log(body)
      } else {
        console.log('http error', response)
        const body = await response.text()
        console.log(body)
      }
    } catch (error) {
      console.log('error', error)
    }
  }
}
