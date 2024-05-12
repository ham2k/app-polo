/*
 * Copyright ©️ 2024 Sebastian Delmont <sd@ham2k.com>
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License, v. 2.0.
 * If a copy of the MPL was not distributed with this file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

export function gaussianRandom (mean, variance) {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random() // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random()
  const normal = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  return normal * variance + mean
}

export function poissonRandom (mean) {
  const L = Math.exp(-mean)
  let p = 1
  let k = 0
  do {
    k++
    p *= Math.random()
  } while (p > L)
  return k - 1
}
