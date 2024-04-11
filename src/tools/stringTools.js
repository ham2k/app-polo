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

export function countTemplate (count, { zero, one, more }, context = {}) {
  if (count === 0) {
    return simpleTemplate(zero ?? more, { ...context, count })
  } else if (count === 1) {
    return simpleTemplate(one ?? more, { ...context, count })
  } else {
    return simpleTemplate(more, { ...context, count })
  }
}

export function sanitizeToISO8859 (text) {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[”“]/g, '"').replace(/[‘’]/g, "'").replace(/[^\x00-\xFF]/g, '·')
}
