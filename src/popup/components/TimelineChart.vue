<template>
  <!-- 配信の推移: 同時接続数 (線) とコメント数 (棒) を、時間の軸をそろえて上下に並べる (1 つのグラフに 2 つの目盛りは使わない) -->
  <section class="card relative px-3 py-2.5" @mouseleave="hoverIndex = undefined">
    <div v-for="panel in panels" :key="panel.key" class="not-first:mt-1.5">
      <h3 class="text-xs font-bold text-zinc-700">{{ panel.title }}</h3>
      <svg
        class="block w-full touch-none"
        :viewBox="`0 0 ${WIDTH} ${panel.height}`"
        role="img"
        :aria-label="panel.title"
        @pointermove="handlePointer"
        @pointerdown="handlePointer"
      >
        <!-- 記録が無い時も枠と目盛りは出す -->
        <text
          v-if="panel.empty"
          :x="PLOT_LEFT + (WIDTH - PLOT_LEFT - PLOT_RIGHT) / 2"
          :y="PLOT_TOP + PLOT_HEIGHT / 2"
          text-anchor="middle"
          dominant-baseline="middle"
          :fill="MUTED_TEXT"
          font-size="11"
        >記録なし</text>

        <!-- 記録できなかった時間 (ページを閉じていた・同接が読めなかった) はグレーの背景 -->
        <rect
          v-for="gap in panel.gaps"
          :key="gap.t"
          :x="gap.x"
          :y="PLOT_TOP"
          :width="gap.width"
          :height="PLOT_HEIGHT"
          :fill="MISSING_COLOR"
        />

        <!-- 目盛り線 (控えめに) と値 -->
        <g v-for="tick in panel.yTicks" :key="tick.value">
          <line
            :x1="PLOT_LEFT"
            :x2="WIDTH - PLOT_RIGHT"
            :y1="tick.y"
            :y2="tick.y"
            :stroke="tick.value === 0 ? AXIS_COLOR : GRID_COLOR"
            stroke-width="1"
          />
          <text
            :x="PLOT_LEFT - 6"
            :y="tick.y"
            text-anchor="end"
            dominant-baseline="middle"
            :fill="MUTED_TEXT"
            font-size="10"
          >{{ tick.label }}</text>
        </g>

        <!-- 同時接続数: 2px の線. 読めなかった分は線を切る -->
        <template v-if="panel.key === 'viewers'">
          <path
            v-for="(d, i) in viewerPaths"
            :key="i"
            :d="d"
            fill="none"
            :stroke="VIEWERS_COLOR"
            stroke-width="2"
            stroke-linejoin="round"
            stroke-linecap="round"
          />
          <circle
            v-if="hoverPoint?.viewers !== undefined"
            :cx="centerX(hoverPoint.t)"
            :cy="viewersY(hoverPoint.viewers)"
            r="4"
            :fill="VIEWERS_COLOR"
            stroke="white"
            stroke-width="2"
          />
        </template>

        <!-- コメント数・スパチャ: 1 分ごとの棒 (上だけ角丸、棒の間は少し空ける) -->
        <template v-else>
          <path
            v-for="bar in panel.bars"
            :key="bar.t"
            :d="bar.d"
            :fill="panel.color"
            :opacity="hoverPoint && hoverPoint.t !== bar.t ? 0.45 : 1"
          />
        </template>

        <!-- 最大値の所に ▼ と値 (値は ▼ の横. 右端に近い時は左に出す) -->
        <g v-if="panel.peak" pointer-events="none">
          <path :d="`M${panel.peak.x - 4},${panel.peak.y - 10}h8l-4,6z`" :fill="panel.color" />
          <text
            :x="panel.peak.x + (panel.peak.anchor === 'start' ? 6 : -6)"
            :y="panel.peak.y - 7"
            :text-anchor="panel.peak.anchor"
            dominant-baseline="middle"
            :fill="PEAK_TEXT"
            font-size="10"
            font-weight="bold"
          >{{ panel.peak.label }}</text>
        </g>

        <!-- 時刻の目盛り (下のグラフだけ) -->
        <template v-if="panel.showXAxis">
          <text
            v-for="tick in xTicks"
            :key="tick.t"
            :x="tick.x"
            :y="panel.height - 3"
            text-anchor="middle"
            :fill="MUTED_TEXT"
            font-size="10"
          >{{ tick.label }}</text>
        </template>

        <!-- マウスを乗せている分の縦線 (上下のグラフで同じ位置) -->
        <line
          v-if="hoverPoint"
          :x1="centerX(hoverPoint.t)"
          :x2="centerX(hoverPoint.t)"
          :y1="PLOT_TOP"
          :y2="panel.plotBottom"
          :stroke="AXIS_COLOR"
          stroke-width="1"
          stroke-dasharray="3 3"
        />
      </svg>
    </div>

    <!-- マウスを乗せている分の値 -->
    <div
      v-if="hoverPoint"
      class="pointer-events-none absolute top-2 z-10 min-w-36 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
      :style="tooltipStyle"
    >
      <p class="font-bold text-zinc-950">{{ formatTime(hoverPoint.t) }}</p>
      <p v-if="elapsedLabel(hoverPoint.t)" class="text-zinc-500">{{ elapsedLabel(hoverPoint.t) }}</p>
      <p class="mt-1 flex items-center gap-1.5 text-zinc-700">
        <span class="inline-block h-0.5 w-3 rounded-full" :style="{ backgroundColor: VIEWERS_COLOR }" />
        同接 <strong class="ml-auto text-zinc-950">{{ hoverPoint.viewers?.toLocaleString() ?? '-' }} 人</strong>
      </p>
      <p class="flex items-center gap-1.5 text-zinc-700">
        <span class="inline-block size-2 rounded-xs" :style="{ backgroundColor: COMMENTS_COLOR }" />
        コメント <strong class="ml-auto text-zinc-950">{{ hoverPoint.comments.toLocaleString() }} 件</strong>
      </p>
      <p class="flex items-center gap-1.5 text-zinc-700">
        <span class="inline-block size-2 rounded-xs" :style="{ backgroundColor: SUPER_COLOR }" />
        スパチャ <strong class="ml-auto text-zinc-950">{{ superLabel(hoverPoint.t) }}</strong>
      </p>
    </div>

    <p v-if="hasGaps" class="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
      <span class="inline-block size-2.5 rounded-xs" :style="{ backgroundColor: MISSING_COLOR }" />
      記録できなかった時間
    </p>

    <!-- 表で見る (色が見分けにくい場合・数字を確かめたい場合) -->
    <details v-if="shown.length" class="mt-1.5 text-xs">
      <summary class="cursor-pointer text-zinc-500 select-none">表で見る</summary>
      <div class="mt-1 max-h-48 overflow-y-auto">
        <table class="w-full text-right tabular-nums">
          <thead class="sticky top-0 bg-white text-zinc-500">
            <tr>
              <th class="py-0.5 text-left font-normal">時刻</th>
              <th class="font-normal">配信開始から</th>
              <th class="font-normal">同接</th>
              <th class="font-normal">コメント</th>
              <th class="font-normal">スパチャ{{ superUnit ? ` (${superUnit})` : '' }}</th>
            </tr>
          </thead>
          <tbody class="text-zinc-700">
            <tr v-for="point in shown" :key="point.t" class="border-t border-zinc-100">
              <td class="py-0.5 text-left">{{ formatTime(point.t) }}</td>
              <td>{{ elapsed(point.t) ?? '-' }}</td>
              <td>{{ point.viewers?.toLocaleString() ?? '-' }}</td>
              <td>{{ point.comments.toLocaleString() }}</td>
              <td>{{ superLabel(point.t) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
/**
 * 配信の推移のグラフ (popup の動画の記録の下).
 *
 * - 上から: 同時接続数 (線), コメント数 (棒), スーパーチャットの金額 (棒, 一番多い通貨だけ). 時間の軸は共通.
 * - スーパーチャットは保存したチャットから数える (推移の記録がある時間の分だけ).
 * - 単位の違う 2 つを 1 つのグラフ (左右に目盛り) にすると読み違えるので、上下に分けている.
 * - マウスを乗せると、その分の縦線と値を出す. 「表で見る」で全ての値を表にできる.
 */
import { format } from 'date-fns'
import { computed, ref } from 'vue'
import { hmsString, timeLabel } from '../../lib/util/format'
import Chat from '../../models/Chat'
import { MINUTE, toMinute, type TimelinePoint } from '../../models/Timeline'

const props = defineProps<{
  points: TimelinePoint[]
  chats?: Chat[] // スーパーチャットのグラフ用
  startDate?: Date // 配信開始 (経過時間の表示用)
  endDate?: Date // 配信終了 (これより後は描かない)
}>()

/** 描く記録 (配信が終わった後の分は除く). */
const shown = computed(() => {
  const end = props.endDate?.getTime()
  return end === undefined ? props.points : props.points.filter(p => p.t <= end)
})

// 色 (データ可視化の検証済みパレットの 1, 2 番目) と、控えめな線・文字の色 (zinc)
const VIEWERS_COLOR = '#2a78d6'
const COMMENTS_COLOR = '#eb6834'
const SUPER_COLOR = '#1baf7a'
const GRID_COLOR = '#f4f4f5' // zinc-100
const AXIS_COLOR = '#d4d4d8' // zinc-300
const MUTED_TEXT = '#71717a' // zinc-500
const PEAK_TEXT = '#3f3f46' // zinc-700
const MISSING_COLOR = '#e4e4e7' // zinc-200

// SVG の座標 (viewBox). 幅は popup に合わせ、表示は w-full で伸縮する
const WIDTH = 540
const PLOT_LEFT = 40
const PLOT_RIGHT = 6
const PLOT_TOP = 16 // 最大値の ▼ と値を出す分あける
const PLOT_HEIGHT = 72
const X_AXIS_HEIGHT = 16
const MAX_BAR_WIDTH = 10 // 棒の最大の幅 (popup では viewBox の 1 ≒ 1px). 記録が数分しか無い時に横に広がりすぎないように

/** 1, 2, 5 × 10^n で切りのいい最大値にする. */
function niceMax(value: number): number {
  if (value <= 0) return 1
  const base = 10 ** Math.floor(Math.log10(value))
  return ([1, 2, 5, 10].map(m => m * base).find(v => v >= value) ?? value)
}

/** 目盛りの値 (1.2万 のように短く). */
const compact = new Intl.NumberFormat('ja-JP', { notation: 'compact', maximumFractionDigits: 1 })

/** 配信開始からグラフを始めるのは、記録の最初までがこれ以内の時だけ (24 時間配信・待機所などで何か月も前が開始のことがある). */
const MAX_LEAD = 24 * 60 * MINUTE

/** 時刻の範囲 (最初の分の先頭 〜 最後の分の終わり). 配信の途中から見た時は、配信開始からにする (前は記録の無い時間になる). */
const range = computed(() => {
  // 記録が無い時は配信の時間 (分からなければ直近 1 時間) を軸にする
  if (shown.value.length === 0) {
    const end = toMinute(props.endDate ?? new Date())
    const begin = props.startDate ? toMinute(props.startDate) : undefined
    const start = begin !== undefined && begin <= end && end - begin <= MAX_LEAD ? begin : end - 60 * MINUTE
    return { start, end: end + MINUTE }
  }
  const begin = props.startDate ? toMinute(props.startDate) : undefined
  const first = begin !== undefined && begin < shown.value[0].t && shown.value[0].t - begin <= MAX_LEAD ? begin : shown.value[0].t
  const last = shown.value.at(-1)?.t ?? first
  return { start: first, end: last + MINUTE }
})

const plotWidth = WIDTH - PLOT_LEFT - PLOT_RIGHT
function timeX(t: number): number {
  const { start, end } = range.value
  return PLOT_LEFT + ((t - start) / (end - start)) * plotWidth
}
function centerX(t: number): number {
  return timeX(t + MINUTE / 2)
}

/// スーパーチャット (一番多い通貨の、1 分ごとの合計) ///

const superUnit = computed(() => Chat.sumMoney(props.chats ?? [])[0]?.unit)
const superByMinute = computed(() => {
  const map = new Map<number, { money: number, count: number }>()
  const unit = superUnit.value
  if (unit === undefined) return map
  for (const chat of props.chats ?? []) {
    if (!chat.money || !chat.timestamp || !(chat.isSuperChat || chat.isSuperStickers) || (chat.moneyUnit ?? '') !== unit) continue
    const t = toMinute(chat.timestamp)
    const sum = map.get(t) ?? { money: 0, count: 0 }
    sum.money += chat.money
    sum.count++
    map.set(t, sum)
  }
  return map
})
function superLabel(t: number): string {
  const sum = superByMinute.value.get(t)
  if (!sum) return '-'
  return `${superUnit.value}${sum.money.toLocaleString(undefined, { maximumFractionDigits: 2 })} (${sum.count} 件)`
}

const viewersMax = computed(() => niceMax(Math.max(0, ...shown.value.map(p => p.viewers ?? 0))))
const commentsMax = computed(() => niceMax(Math.max(0, ...shown.value.map(p => p.comments))))
const superMax = computed(() => niceMax(Math.max(0, ...shown.value.map(p => superByMinute.value.get(p.t)?.money ?? 0))))
const plotBottom = PLOT_TOP + PLOT_HEIGHT

function viewersY(value: number): number {
  return plotBottom - (value / viewersMax.value) * PLOT_HEIGHT
}
function commentsY(value: number): number {
  return plotBottom - (value / commentsMax.value) * PLOT_HEIGHT
}
function superY(value: number): number {
  return plotBottom - (value / superMax.value) * PLOT_HEIGHT
}

function yTicks(max: number, toY: (v: number) => number) {
  // 0 ばかりの時 (最大 1) に 0.5 の目盛りを出さない
  return [0, max / 2, max].filter(v => Number.isInteger(v)).map(value => ({ value, y: toY(value), label: compact.format(value) }))
}

interface Panel {
  key: string
  title: string
  height: number
  plotBottom: number
  showXAxis: boolean
  yTicks: ReturnType<typeof yTicks>
  bars: { t: number, d: string }[]
  color: string
  gaps: Gap[]
  empty: boolean // 記録が無い (「記録なし」と出す)
  peak?: Peak // 最大値の印
}

interface Peak {
  x: number
  y: number
  label: string
  anchor: 'start' | 'end'
}

/** 最大値の所 (同じ値が複数あれば最初). 0 ばかりの時は出さない. */
function findPeak(values: { t: number, value: number }[], toY: (v: number) => number, toLabel: (v: number) => string): Peak | undefined {
  let best: { t: number, value: number } | undefined
  for (const v of values) {
    if (v.value > 0 && (!best || v.value > best.value)) best = v
  }
  if (!best) return undefined
  const x = centerX(best.t)
  return { x, y: toY(best.value), label: toLabel(best.value), anchor: x > WIDTH * 0.8 ? 'end' : 'start' }
}

interface Gap {
  t: number
  x: number
  width: number
}

/** 記録の無い分 (と、同接のグラフでは同接が読めなかった分) を、続いている所をまとめて帯にする. */
function findGaps(isMissing: (point: TimelinePoint | undefined) => boolean): Gap[] {
  const byMinute = new Map(shown.value.map(p => [p.t, p]))
  const gaps: Gap[] = []
  if (byMinute.size === 0) return gaps // 全く無い時は「記録なし」と出すので塗らない
  let from: number | undefined
  const { start, end } = range.value
  for (let t = start; t <= end; t += MINUTE) {
    const missing = t < end && isMissing(byMinute.get(t))
    if (missing && from === undefined) from = t
    if (!missing && from !== undefined) {
      gaps.push({ t: from, x: timeX(from), width: timeX(t) - timeX(from) })
      from = undefined
    }
  }
  return gaps
}
const commentGaps = computed(() => findGaps(p => p === undefined))
const viewerGaps = computed(() => findGaps(p => p?.viewers === undefined))
const hasGaps = computed(() => viewerGaps.value.length > 0)

const panels = computed<Panel[]>(() => {
  const list: Panel[] = [
    {
      key: 'viewers',
      title: '同時接続数',
      height: plotBottom + X_AXIS_HEIGHT,
      plotBottom,
      showXAxis: true,
      yTicks: yTicks(viewersMax.value, viewersY),
      bars: [],
      color: VIEWERS_COLOR,
      gaps: viewerGaps.value,
      empty: !shown.value.some(p => p.viewers !== undefined),
      peak: findPeak(shown.value.map(p => ({ t: p.t, value: p.viewers ?? 0 })), viewersY, v => `${v.toLocaleString()} 人`),
    },
    {
      key: 'comments',
      title: 'コメント数 (上位チャット)',
      height: plotBottom + X_AXIS_HEIGHT,
      plotBottom,
      showXAxis: true,
      yTicks: yTicks(commentsMax.value, commentsY),
      bars: bars(shown.value.map(p => ({ t: p.t, value: p.comments })), commentsY),
      color: COMMENTS_COLOR,
      gaps: commentGaps.value,
      empty: shown.value.length === 0,
      peak: findPeak(shown.value.map(p => ({ t: p.t, value: p.comments })), commentsY, v => `${v.toLocaleString()} 件`),
    },
  ]
  // スーパーチャットが 1 件も無くても出す (0 が続くグラフ)
  const superValues = shown.value.map(p => ({ t: p.t, value: superByMinute.value.get(p.t)?.money ?? 0 }))
  list.push({
    key: 'super',
    title: superUnit.value ? `スーパーチャット (${superUnit.value})` : 'スーパーチャット',
    height: plotBottom + X_AXIS_HEIGHT,
    plotBottom,
    showXAxis: true,
    yTicks: yTicks(superMax.value, superY),
    bars: bars(superValues, superY),
    color: SUPER_COLOR,
    gaps: commentGaps.value,
    empty: shown.value.length === 0,
    peak: findPeak(superValues, superY, v => `${superUnit.value ?? ''}${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`),
  })
  return list
})

/** 同時接続数の線. 値の無い分・記録していない時間で線を切る. */
const viewerPaths = computed(() => {
  const paths: string[] = []
  let current = ''
  let prevT: number | undefined
  for (const point of shown.value) {
    if (point.viewers === undefined || (prevT !== undefined && point.t - prevT > MINUTE)) {
      if (current) paths.push(current)
      current = ''
    }
    if (point.viewers !== undefined) {
      current += `${current ? 'L' : 'M'}${centerX(point.t).toFixed(1)},${viewersY(point.viewers).toFixed(1)}`
      prevT = point.t
    } else {
      prevT = undefined
    }
  }
  if (current) paths.push(current)
  // 1 点だけの線は見えないので短い横線にする
  return paths.map(d => (d.includes('L') ? d : d + `h0.1`))
})

/** 1 分ごとの棒 (上の角だけ丸める). 太すぎる時は MAX_BAR_WIDTH にして、その分の中心に置く. */
function bars(values: { t: number, value: number }[], toY: (v: number) => number): { t: number, d: string }[] {
  const slot = plotWidth / ((range.value.end - range.value.start) / MINUTE)
  const gap = slot > 4 ? 1 : 0
  const width = Math.min(MAX_BAR_WIDTH, Math.max(1, slot - gap))
  return values
    .filter(p => p.value > 0)
    .map((p) => {
      const x = centerX(p.t) - width / 2
      const y = toY(p.value)
      const h = plotBottom - y
      const r = Math.min(2, width / 2, h)
      const d = `M${x},${plotBottom}V${y + r}Q${x},${y} ${x + r},${y}H${x + width - r}Q${x + width},${y} ${x + width},${y + r}V${plotBottom}Z`
      return { t: p.t, d }
    })
}

/** 目盛りの間隔の候補 (分). 1 日以上も入れておく (長い記録でも目盛りが多くなりすぎないように). */
const X_STEPS = [1, 2, 5, 10, 15, 30, 60, 120, 180, 360, 720, 1440, 2880, 10080]

/**
 * 時刻の目盛り. 配信開始が分かれば、開始からの経過時間が切りのいい所 (0:30, 1:00 ...) に置く.
 * 文字が重ならない数 (文字の幅の目安ごと) に間引き、端からはみ出すものは出さない.
 */
const xTicks = computed(() => {
  const { start, end } = range.value
  const minutes = (end - start) / MINUTE
  // 1 日を超える時は時刻に日付も付ける. 文字の幅の目安 ("1:05 (21:10)" が 70, "26:00 (11/24 8:00)" が 100 くらい)
  const pattern = minutes > 24 * 60 ? 'M/d H:mm' : 'H:mm'
  const labelWidth = minutes > 24 * 60 ? 110 : 80
  const maxCount = Math.max(2, Math.floor(plotWidth / labelWidth))
  // 候補で足りない (何週間もある) 時は 1 週間の倍数にする
  const step = (X_STEPS.find(s => minutes / s <= maxCount) ?? Math.ceil(minutes / maxCount / 10080) * 10080) * MINUTE
  const base = props.startDate ? toMinute(props.startDate) : 0
  const ticks = []
  for (let t = base + Math.ceil((start - base) / step) * step; t <= end; t += step) {
    const x = timeX(t)
    if (x - labelWidth / 2 < 0 || x + labelWidth / 2 > WIDTH) continue
    ticks.push({ t, x, label: timeLabel(t, props.startDate, pattern) })
  }
  return ticks
})

/// マウスを乗せた時 ///

const hoverIndex = ref<number>()
const hoverPoint = computed(() => (hoverIndex.value === undefined ? undefined : shown.value[hoverIndex.value]))

/** マウスの位置に一番近い分を選ぶ. (縦の帯全体が当たり判定) */
function handlePointer(event: PointerEvent): void {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const x = ((event.clientX - rect.left) / rect.width) * WIDTH
  if (x < PLOT_LEFT || x > WIDTH - PLOT_RIGHT) {
    hoverIndex.value = undefined
    return
  }
  let best = 0
  shown.value.forEach((p, i) => {
    if (Math.abs(centerX(p.t) - x) < Math.abs(centerX(shown.value[best].t) - x)) best = i
  })
  hoverIndex.value = best
}

/** 値の箱は、縦線の反対側に出す (線と重ならないように). */
const tooltipStyle = computed(() => {
  if (!hoverPoint.value) return {}
  const ratio = centerX(hoverPoint.value.t) / WIDTH
  return ratio > 0.55 ? { right: `${(1 - ratio) * 100 + 3}%` } : { left: `${ratio * 100 + 3}%` }
})

function formatTime(t: number): string {
  return format(t, 'yyyy-MM-dd HH:mm')
}

/** 配信開始からの経過時間. */
function elapsed(t: number): string | undefined {
  const start = props.startDate?.getTime()
  return start === undefined ? undefined : hmsString((t - start) / 1000)
}
function elapsedLabel(t: number): string | undefined {
  const text = elapsed(t)
  return text ? `配信開始から ${text}` : undefined
}
</script>
