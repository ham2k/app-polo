/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function findRef (obj, type) {
  if (obj?.refs) obj = obj.refs

  return (obj?.find ? obj.find(r => r?.type === type) : undefined)
}

export function hasRef (obj, type) {
  return !!findRef(obj, type)
}

export function filterRefs (obj, type) {
  if (obj?.refs) obj = obj.refs

  return (obj?.filter ? obj.filter(r => r?.type === type) : [])
}

export function excludeRefs (obj, type) {
  if (obj?.refs) obj = obj.refs

  return (obj?.filter ? obj.filter(r => r?.type !== type) : [])
}

export function refsToString (obj, type, options = {}) {
  let refs
  refs = filterRefs(obj?.refs ?? obj ?? [], type)
  let suffix = ''
  if (options.limit) {
    if (refs.length > options.limit) {
      suffix = ` +${refs.length - options.limit}`
      refs = refs.slice(0, options.limit)
    }
  }
  return refs.filter(r => r?.ref).map(r => r.ref).join(options.separator ?? ', ') + suffix
}

export function stringToRefs (type, str, options = {}) {
  let refs = str.split(options.separator ?? /\s*,\s*/).map(r => r && r.trim()).filter(r => r)

  if (options.regex) refs = refs.filter(r => r.match(options.regex) || r.indexOf('?') >= 0)

  return refs.filter(ref => ref).map(ref => ({ type, ref }))
}

export function replaceRefs (originalRefs, type, newRefs) {
  const otherRefs = (originalRefs?.refs ?? originalRefs ?? []).filter(r => r && r.type !== type)
  return [...otherRefs, ...newRefs]
}

export function replaceRef (originalRefs, type, newRef) {
  return replaceRefs(originalRefs, type, [newRef])
}

export function removeRefs (originalRefs, type) {
  return replaceRefs(originalRefs, type, [])
}

export function removeRef (originalRefs, type) {
  return replaceRefs(originalRefs, type, [])
}
