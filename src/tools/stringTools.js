import { capitalizeString } from './capitalizeString'

export function camelCaseToWords (camelCase, { capitalize } = {}) {
  let words = (camelCase || '').replace(/([A-Z])/g, ' $1')
  if (capitalize) words = capitalizeString(words)

  return words
}
