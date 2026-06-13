// Copyright ©️ 2025 Sebastian Delmont <sd@ham2k.com>
// SPDX-License-Identifier: MPL-2.0

import { setupServer } from 'msw/native'
import { handlers } from './handlers'

export const server = setupServer(...handlers)
