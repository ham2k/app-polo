import packageJson from '../../../../package.json'

export const GMAPostSpotAPI = async ({ call, comments, freq, mode, ref, spotterCall, url }) => {
  try {
    const response = await fetch(url ?? 'https://www.cqgma.org/spotsmart2.php', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': `Ham2K Portable Logger/${packageJson.version}`
      },
      body: new URLSearchParams({
        yspotter: spotterCall,
        ycall: call,
        yreference: ref,
        yqrg: freq,
        ymode: mode,
        ycomment: comments.filter((x) => (x)).join(' '),
        B1: 'Submit'
      }).toString()
    })
    if (response.status === 200) {
      return true
    } else {
      const body = await response.text()
      console.error('Error in GMA Spot', { response, body })
      return false
    }
  } catch (error) {
    console.error('Error in GMA Spot', error)
    return false
  }
}
