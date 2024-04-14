const timerLast = {}
const timerStart = {}

export function logTimer (timer, msg, { reset } = {}) {
  const now = Date.now()
  if (reset || !timerStart[timer]) {
    timerStart[timer] = now
    timerLast[timer] = now
  }
  console.info(`[${timer}] ${now - timerLast[timer]} ms - ${msg}`)
  timerLast[timer] = now
}
