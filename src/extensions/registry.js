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

export function findHooks (hookCategory, { key } = {}) {
  let hooks = (Hooks[hookCategory] ?? []).map(h => h.hook)
  if (key) hooks = hooks.filter(h => h.key === key)

  return hooks
}

function registerHook (hookCategory, { extension, hook, name, priority }) {
  if (!Hooks[hookCategory] && !VALID_HOOK_REGEX.test(hookCategory)) {
    console.error(`Invalid hook ${hookCategory} for extension ${extension.key}`)
    return false
  }
  if (!hook) hook = extension[hookCategory]
  if (!name) name = hookCategory
  const newHooks = (Hooks[hookCategory] ?? []).filter(h => h.key !== extension.key && h.name !== name)
  newHooks.push({ key: extension.key, extension, name, hook, priority })
  newHooks.sort((a, b) => (a.priority ?? extension.priority) - (b.priority ?? extension.priority))
  Hooks[hookCategory] = newHooks
}

function unregisterHooks (hookCategory, { extension }) {
  Hooks[hookCategory] = Hooks[hookCategory].filter(h => h.key !== extension.key)
}

export function activateExtension (extension) {
  if (extension.onActivation) {
    extension.onActivation({
      registerHook: (hookCategory, props) => { registerHook(hookCategory, { ...props, extension }) }
    })
  }
}

export function deactivateExtension (extension) {
  Object.keys(Hooks).forEach(hookName => {
    unregisterHooks(hookName, { extension })
  })
  if (extension.onDeactivation) {
    extension.onDeactivation({})
  }
}
