#!/usr/bin/env node
/**
 * vitest を起動するラッパー.
 *
 * Windows でカレントディレクトリのドライブレターが小文字 (c:\...) だと、vitest 本体が
 * 別パスとして二重に読み込まれ、全テストが "Cannot read properties of undefined (reading 'config')" で落ちる.
 * (VS Code の terminal で起きやすい) そのためドライブレターを大文字にしてから起動する.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const cwd = process.cwd().replace(/^[a-z]:/, drive => drive.toUpperCase())
const bin = path.join(cwd, 'node_modules', 'vitest', 'vitest.mjs')
const { status } = spawnSync(process.execPath, [bin, ...process.argv.slice(2)], { cwd, stdio: 'inherit' })
process.exit(status ?? 1)
