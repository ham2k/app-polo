import { capitalizeString } from './capitalizeString'

export function camelCaseToWords (camelCase, { capitalize } = {}) {
  let words = (camelCase || '').replace(/([A-Z])/g, ' $1')
  if (capitalize) words = capitalizeString(words)

  return words
}

export function simpleTemplate (template, values = {}, context = {}) {
  return template.replace(/\{(.*?)}/g, (match, key) => {
    if (typeof values[key] === 'function') {
      return values[key](key, context)
    } else if (typeof values._default === 'function') {
      return values._default(key, context)
    } else {
      return values[key] || match
    }
  })
}

export function sanitizeToISO8859 (text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[”“]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x00-\xFF]/g, '·')
}
