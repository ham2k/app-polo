export function joinAnd (parts, { separator = ', ', conjunction = 'and' } = {}) {
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0]
  if (parts.length === 2) return parts.join(` ${conjunction} `)
  return parts.slice(0, -1).join(separator) + `${separator}${conjunction} ` + parts.slice(-1)
}
