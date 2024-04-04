import { reportError } from '../App'
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
  activity: [],
  command: [],
  screen: [],
  setting: []
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
    reportError(`Invalid hook ${hookCategory} for extension ${extension.key}`)
    return false
  }

  if (!hook) hook = extension[hookCategory]
  if (!extension) extension = hook.extension

  const newHooks = (Hooks[hookCategory] ?? []).filter(h => h.key !== (hook.key ?? extension.key))
  newHooks.push({ key: hook.key ?? extension.key, extension, hook, priority })
  newHooks.sort((a, b) => (b.priority ?? b.extension?.priority ?? 0) - (a.priority ?? a.extension?.priority ?? 0))
  Hooks[hookCategory] = newHooks
}

function unregisterAllHooks (hookCategory, { extension }) {
  Hooks[hookCategory] = Hooks[hookCategory].filter(h => h.key !== extension.key)
}

export async function activateEnabledExtensions (dispatch, getState) {
  const settings = selectSettings(getState()) || {}
  const extensions = allExtensions()
  for (const extension of extensions) {
    console.log('Activating extension', extension.key)
    if (extension.alwaysEnabled || (settings[`extensions/${extension.key}`] ?? extension.enabledByDefault)) {
      await dispatch(activateExtension(extension))
    }
    console.log('Done activating extension', extension.key)
  }
}

export const activateExtension = (extension) => async (dispatch) => {
  if (extension.onActivation) {
    extension.onActivation({
      registerHook: (hookCategory, props) => { registerHook(hookCategory, { ...props, extension }) }
    })
  }
  if (extension.onActivationDispatch) {
    await dispatch(extension.onActivationDispatch({
      registerHook: (hookCategory, props) => { registerHook(hookCategory, { ...props, extension }) }
    }))
  }
}

export const deactivateExtension = (extension) => async (dispatch) => {
  if (extension.onDeactivation) {
    extension.onDeactivation({})
  }
  if (extension.onDeactivationDispatch) {
    await dispatch(extension.onDeactivationDispatch({}))
  }
  Object.keys(Hooks).forEach(hookCategory => {
    unregisterAllHooks(hookCategory, { extension })
  })
}
