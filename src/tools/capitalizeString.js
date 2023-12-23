const WORD_OR_HYPENED_SEPARATOR_REGEX = /([^\s-]+?)([\s-]+|\s*$)/g

const CAPTITALIZATION_EXCEPTIONS = {
  i: 'II',
  iii: 'III',
  iv: 'IV',
  arrl: 'ARRL',
  ares: 'ARES',
  fcc: 'FCC',
  qrz: 'QRZ',
  clublog: 'ClubLog',
  ham2k: 'Ham2K',
  nasa: 'NASA'
}

export function capitalizeString (str, options = {}) {
  const { mode } = options

  if (!str) return str
  return str.trim().toLowerCase().replace(WORD_OR_HYPENED_SEPARATOR_REGEX, (match, word, separator) => {
    if (CAPTITALIZATION_EXCEPTIONS[word]) {
      return CAPTITALIZATION_EXCEPTIONS[word] + separator
    } else if (word.length === 1 && mode === 'name') {
      return word.toUpperCase() + '.' + separator
    } else {
      return word.charAt(0).toUpperCase() + word.slice(1) + separator
    }
  })
}
