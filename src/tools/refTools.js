export function findRef (obj, type) {
  if (obj?.refs) obj = obj.refs

  return (obj?.find ? obj.find(r => r.type === type) : undefined)
}

export function filterRefs (obj, type) {
  if (obj?.refs) obj = obj.refs

  return (obj?.filter ? obj.filter(r => r.type === type) : [])
}

export function refsToString (obj, type, options = {}) {
  let refs
  if (obj?.refs) {
    refs = filterRefs(obj, type)
  } else {
    refs = obj || []
  }

  let suffix = ''
  if (options.limit) {
    if (refs.length > options.limit) {
      suffix = ` +${refs.length - options.limit}`
      refs = refs.slice(0, options.limit)
    }
  }
  return refs.map(r => r.ref).join(options.separator ?? ', ') + suffix
}

export function stringToRefs (type, str, options = {}) {
  let refs = str.split(options.separator ?? /\s*,\s*/).map(r => r.trim()).filter(r => r)
  if (options.regex) refs = refs.filter(r => r.match(options.regex))
  return refs.map(ref => ({ type, ref }))
}

export function replaceRefs (originalRefs, type, newRefs) {
  const otherRefs = (originalRefs || []).filter(r => r.type !== type)
  return [...otherRefs, ...newRefs]
}
