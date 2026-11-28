<template>
  <!-- 選んだ動画の記録: 最大再生数・最大同接・スーパーチャット合計 (どれも見ていた間の記録なので目安) -->
  <dl v-if="rows.length" class="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs">
    <template v-for="row in rows" :key="row.label">
      <dt class="whitespace-nowrap text-zinc-500">
        <i class="mdi" :class="row.icon" />
        {{ row.label }}
      </dt>
      <!-- 回数・金額と、日付・詳細は同じ枠に入れる -->
      <dd class="min-w-0" :title="row.title">
        <strong class="text-sm text-zinc-950">{{ row.value }}</strong>
        <span v-if="row.note" class="ml-1.5 text-zinc-500">{{ row.note }}</span>
        <span v-if="row.sub" class="block text-zinc-500">{{ row.sub }}</span>
      </dd>
    </template>
  </dl>
</template>

<script setup lang="ts">
/**
 * 動画の記録の要約 (popup のチャット一覧の上).
 *
 * - 最大再生数・最大同時接続数: 記録した日時と、配信開始からの経過時間を添える.
 * - 再生数・高評価・コメント数は全ての動画で出す. 同接・チャット数・スパチャ合計は配信 (ライブ・アーカイブ) だけ.
 * - スーパーチャット合計: 一番多い通貨の合計 + それ以外は「外貨 〇 件」にまとめる (内訳は title).
 *   無くても出し、メンバーシップギフトの配布数・ギフト (星など) の件数も添える.
 */
import { format } from 'date-fns'
import { computed } from 'vue'
import { hmsString } from '../../lib/util/format'
import Chat from '../../models/Chat'
import type { ViewCountPoint } from '../../models/Timeline'
import type Video from '../../models/Video'

const props = defineProps<{
  video: Video
  chats: Chat[]
  viewCounts: ViewCountPoint[]
}>()

interface Row {
  label: string
  icon: string
  value: string
  note?: string
  title?: string
  sub?: string // 2 行目の補足
}

/** 金額の表示 (小数は 2 桁まで). */
function formatMoney(unit: string, money: number): string {
  return `${unit}${money.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

/** "2026-11-22 14:30:12 (1:53:00)". カッコは配信開始からの経過時間. */
function formatAt(at?: Date): string | undefined {
  if (!at) return undefined
  const start = props.video.startDate
  const elapsed = start ? ` (${hmsString((at.getTime() - start.getTime()) / 1000)})` : ''
  return `${format(at, 'yyyy-MM-dd HH:mm:ss')}${elapsed}`
}

const rows = computed<Row[]>(() => {
  const video = props.video
  const list: Row[] = []

  // 最大再生数が無い古い記録は、最後に開いた時の再生数を出す
  const viewCount = video.maxViewCount || video.viewCount
  if (viewCount) {
    const at = video.maxViewCount ? video.maxViewCountAt : video.updatedAt
    list.push({ label: '最大再生数', icon: 'mdi-play-circle-outline', value: `${viewCount.toLocaleString()} 回`, note: formatAt(at) })
  }

  // 高評価数・コメント数 (動画のコメント欄) は記録した中の最大値
  const maxOf = (key: 'likes' | 'commentCount') => props.viewCounts.reduce<number | undefined>((m, p) => {
    const v = p[key]
    return v === undefined ? m : Math.max(m ?? 0, v)
  }, undefined)
  const likes = maxOf('likes')
  const comments = maxOf('commentCount')
  list.push({ label: '高評価', icon: 'mdi-thumb-up-outline', value: likes !== undefined ? `${likes.toLocaleString()} 件` : '-', note: likes === undefined ? '記録なし' : undefined })
  list.push({ label: 'コメント', icon: 'mdi-comment-text-outline', value: comments !== undefined ? `${comments.toLocaleString()} 件` : '-', note: comments === undefined ? '記録なし' : undefined })

  // 普通の動画 (配信ではない) には同接・チャット・スパチャが無いので出さない
  if (video.type === 'video') return list

  // 同時接続数は配信中にページを開いている間しか取れない (この機能より前に記録した動画にも無い)
  if (video.maxViewers) {
    list.push({ label: '最大同接', icon: 'mdi-account-multiple-outline', value: `${video.maxViewers.toLocaleString()} 人`, note: formatAt(video.maxViewersAt) })
  } else {
    list.push({ label: '最大同接', icon: 'mdi-account-multiple-outline', value: '-', note: '記録なし' })
  }

  list.push({ label: 'チャット', icon: 'mdi-message-text-outline', value: `${props.chats.length.toLocaleString()} 件` })

  // 無くても出す. メンバーシップギフトの配布数・ギフト (星など) の件数も添える
  const [main, ...others] = Chat.sumMoney(props.chats)
  const otherCount = others.reduce((sum, o) => sum + o.count, 0)
  const giftChats = props.chats.filter(c => c.isGift)
  const giftMembers = giftChats.reduce((sum, c) => sum + (c.giftCount ?? 1), 0) // 個数が読めなかったものは 1 個
  const giftItems = props.chats.filter(c => c.giftItem !== undefined).length
  list.push({
    label: 'スパチャ合計',
    icon: 'mdi-cash-multiple',
    value: main ? formatMoney(main.unit, main.money) : '0',
    note: `(${main?.count ?? 0} 件)${otherCount ? ` + 外貨 ${otherCount} 件` : ''}`,
    title: main ? [main, ...others].map(s => `${formatMoney(s.unit, s.money)} (${s.count} 件)`).join('\n') : undefined,
    sub: `🎁 メンバーシップ配布 ${giftMembers} 個 (${giftChats.length} 件)・🎀 ギフト(星など) ${giftItems} 件`,
  })
  return list
})
</script>
