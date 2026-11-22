import { describe, expect, it } from 'vitest'
import ChatCsv from '../src/lib/util/ChatCsv'
import Chat from '../src/models/Chat'
import Video from '../src/models/Video'

const video = Object.assign(new Video(), { id: 'dQw4w9WgXcQ', title: 'タイトル, "引用"' })
const chat = (props: Partial<Chat>) => Object.assign(new Chat(), props)

/** BOM を外して行 (CRLF) ごとに分ける. */
function rows(csv: string): string[] {
  expect(csv.startsWith('﻿')).toBe(true)
  return csv.slice(1).split('\r\n').slice(0, -1)
}

describe('ChatCsv', () => {
  it('ヘッダーと各列を出力する', () => {
    const csv = ChatCsv.generate(video, [
      chat({
        id: 'c1',
        timestamp: new Date(2026, 10, 22, 10, 0, 5),
        seconds: 3725,
        authorName: 'name',
        altMessage: 'hello',
        isOwner: true,
        isSuperChat: true,
        money: 1000,
        moneyUnit: '￥',
      }),
    ])
    const [header, line] = rows(csv)

    expect(header.split(',')).toEqual([
      '投稿日時',
      '経過時間',
      '経過秒',
      '投稿者',
      '本文',
      '配信者',
      'モデレーター',
      '確認済み',
      'メンバー',
      'メンバー歴(月)',
      'メンバー加入',
      'メンバー歴チャット',
      'メンバーシップギフト',
      'ギフト数',
      'トップチャット順位',
      'スパチャへの返信先',
      'スーパーチャット',
      '金額',
      '通貨',
      '動画ID',
      '動画タイトル',
      'チャットID',
    ])
    expect(line).toBe('2026-11-22 10:00:05,1:02:05,3725,name,hello,1,,,,,,,,,,,1,1000,￥,dQw4w9WgXcQ,"タイトル, ""引用""",c1')
  })

  it('経過秒の順に並べる', () => {
    const csv = ChatCsv.generate(video, [chat({ id: 'b', seconds: 20 }), chat({ id: 'a', seconds: -5 }), chat({ id: 'c', seconds: 100 })])
    expect(
      rows(csv)
        .slice(1)
        .map(r => r.split(',').at(-1)),
    ).toEqual(['a', 'b', 'c'])
  })

  it('改行・カンマ・ダブルクォートを含む値を囲む', () => {
    const [, line] = rows(ChatCsv.generate(video, [chat({ altMessage: '1行目\n2行目, "です"' })]))
    expect(line).toContain('"1行目\n2行目, ""です"""')
  })

  it('数式として解釈される値の先頭に \' を付ける (CSV インジェクション対策)', () => {
    const [, line] = rows(ChatCsv.generate(video, [chat({ authorName: '@user', altMessage: '=1+1', seconds: -5 })]))
    const cells = line.split(',')
    expect(cells[1]).toBe(`"'-00:05"`)
    expect(cells[2]).toBe('-5') // 数値はそのまま
    expect(cells[3]).toBe(`"'@user"`)
    expect(cells[4]).toBe(`"'=1+1"`)
  })

  it('複数の動画をまとめる (動画は渡された順、動画の中は時間順)', () => {
    const other = Object.assign(new Video(), { id: 'other000000', title: 'other' })
    const csv = ChatCsv.generateMany([
      { video, chats: [chat({ id: 'a2', seconds: 20 }), chat({ id: 'a1', seconds: 10 })] },
      { video: other, chats: [chat({ id: 'b1', seconds: 5 })] },
    ])
    const lines = rows(csv)
    expect(lines).toHaveLength(4) // ヘッダーは 1 行だけ
    expect(lines.slice(1).map(r => r.split(',').at(-1))).toEqual(['a1', 'a2', 'b1'])
    expect(lines[3]).toContain('other000000,other,b1')
  })
})
