import { selectSettings } from '../store/settings'

/*
 * # Extensions Registry
 * An extension is a module that can be registered to the application to extend its functionality.
 *
 * It can be enabled or disabled at runtime based on defaults and user preferences.
 *
 * It can register `hooks` to be called at specific points in the application lifecycle.
 *
 */
const Extensions = {
}

const Hooks = {
  activity: []
}

const VALID_HOOK_REGEX = /^(ref:\w+)/

export function registerExtension (extension) {
  Extensions[extension.key] = extension
}

export function getExtension (key) {
  return Extensions[key]
}

export function allExtensions () {
  return Object.values(Extensions)
}

export function findHooks (hookCategory, { key } = {}) {
  let hooks = (Hooks[hookCategory] ?? []).map(h => h.hook)
  if (key) hooks = hooks.filter(h => h.key === key)

  return hooks
}

export function findBestHook (hookCategory, options) {
  return findHooks(hookCategory, options)[0]
}

function registerHook (hookCategory, { extension, hook, priority }) {
  if (!Hooks[hookCategory] && !VALID_HOOK_REGEX.test(hookCategory)) {
    console.error(`Invalid hook ${hookCategory} for extension ${extension.key}`)
    return false
  }
  if (!hook) hook = extension[hookCategory]
  const newHooks = (Hooks[hookCategory] ?? []).filter(h => h.key !== extension.key)
  newHooks.push({ key: extension.key, extension, hook, priority })
  newHooks.sort((a, b) => (b.priority ?? b.extension?.priority ?? 0) - (a.priority ?? a.extension?.priority ?? 0))
  Hooks[hookCategory] = newHooks
}

function unregisterAllHooks (hookCategory, { extension }) {
  Hooks[hookCategory] = Hooks[hookCategory].filter(h => h.key !== extension.key)
}

export function activateEnabledExtensions (dispatch, getState) {
  const settings = selectSettings(getState()) || {}
  const extensions = allExtensions()
  extensions.forEach(extension => {
    if (extension.alwaysEnabled || (settings[`extensions/${extension.key}`] ?? extension.enabledByDefault)) {
      dispatch(activateExtension(extension))
    }
  })
}

export const activateExtension = (extension) => (dispatch) => {
  if (extension.onActivation) {
    extension.onActivation({
      registerHook: (hookCategory, props) => { registerHook(hookCategory, { ...props, extension }) }
    })
  }
  if (extension.onActivationDispatch) {
    dispatch(extension.onActivationDispatch({
      registerHook: (hookCategory, props) => { registerHook(hookCategory, { ...props, extension }) }
    }))
  }
}

export const deactivateExtension = (extension) => (dispatch) => {
  if (extension.onDeactivation) {
    extension.onDeactivation({})
  }
  if (extension.onDeactivationDispatch) {
    dispatch(extension.onDeactivationDispatch({}))
  }
  Object.keys(Hooks).forEach(hookCategory => {
    unregisterAllHooks(hookCategory, { extension })
  })
}
