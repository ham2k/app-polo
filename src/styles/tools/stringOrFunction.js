export function stringOrFunction (value, ...args) {
  if (typeof value === 'function') {
    return value(...args)
  }
  return value
}
