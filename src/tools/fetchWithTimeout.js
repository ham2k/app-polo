/*
 * Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

const DEFAULT_TIMEOUT = 10000 // 10 seconds

export async function fetchWithTimeout (url, options) {
  const { timeout = DEFAULT_TIMEOUT, ...fetchOptions } = options || {}

  try {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal
    })

    clearTimeout(timeoutId) // Clear timeout if fetch succeeds

    return response
  } catch (error) {
    clearTimeout(timeoutId) // Clear timeout if there were other errors
    if (error.name === 'AbortError') {
      throw new FetchTimeoutError()
    } else {
      throw error
    }
  }
}

export class FetchTimeoutError extends Error {
  constructor(message = 'Request timed out') {
    super(message)
    this.name = 'FetchTimeoutError'
  }
}
