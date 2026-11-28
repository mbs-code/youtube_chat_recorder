<template>
  <!-- 再生数・高評価・コメント数のどれか 1 項目の推移. 3 つ並べて使い、横軸 (時間) とマウスの位置を連動させる -->
  <div class="relative" @mouseleave="hoverT = undefined">
    <h3 class="flex items-center gap-1.5 text-xs font-bold text-zinc-700">
      {{ metric.label }}
    </h3>
    <svg
      class="block w-full touch-none"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      role="img"
      :aria-label="metric.label"
      @pointermove="handlePointer"
      @pointerdown="handlePointer"
    >
      <g v-for="tick in yTicks" :key="tick.value">
        <line
          :x1="PLOT_LEFT"
          :x2="WIDTH - PLOT_RIGHT"
          :y1="tick.y"
          :y2="tick.y"
          :stroke="tick.value === yMin ? AXIS_COLOR : GRID_COLOR"
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

      <text
        v-if="series.length === 0"
        :x="PLOT_LEFT + plotWidth / 2"
        :y="PLOT_TOP + PLOT_HEIGHT / 2"
        text-anchor="middle"
        dominant-baseline="middle"
        :fill="MUTED_TEXT"
        font-size="11"
      >記録なし</text>

      <path
        :d="linePath"
        fill="none"
        :stroke="metric.color"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <!-- 記録した点 (多い時はマウスを乗せた点だけ) -->
      <circle
        v-for="point in series"
        v-show="series.length <= 24 || hoverT === point.t"
        :key="point.t"
        :cx="x(point.t)"
        :cy="y(point.value)"
        :r="hoverT === point.t ? 4 : 2.5"
        :fill="metric.color"
        stroke="white"
        :stroke-width="hoverT === point.t ? 2 : 1"
      />

      <text
        v-for="tick in xTicks"
        :key="tick.t"
        :x="tick.x"
        :y="HEIGHT - 3"
        :text-anchor="tick.anchor"
        :fill="MUTED_TEXT"
        font-size="10"
      >{{ tick.label }}</text>

      <line
        v-if="hoverT !== undefined"
        :x1="x(hoverT)"
        :x2="x(hoverT)"
        :y1="PLOT_TOP"
        :y2="plotBottom"
        :stroke="AXIS_COLOR"
        stroke-width="1"
        stroke-dasharray="3 3"
      />
    </svg>

    <div
      v-if="hoverT !== undefined"
      class="pointer-events-none absolute top-2 z-10 min-w-36 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
      :style="tooltipStyle"
    >
      <p class="font-bold text-zinc-950">{{ formatTime(hoverT) }}</p>
      <p v-if="elapsed(hoverT)" class="text-zinc-500">配信開始から {{ elapsed(hoverT) }}</p>
      <p class="mt-1 flex items-center gap-1.5 text-zinc-700">
        <span class="inline-block h-0.5 w-3 rounded-full" :style="{ backgroundColor: metric.color }" />
        {{ metric.label }}
        <strong class="ml-auto text-zinc-950">
          {{ hoverValue === undefined ? '-' : `${hoverValue.toLocaleString()} ${metric.unit}` }}
        </strong>
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 再生数・高評価数・コメント数の記録のグラフ (popup の記録・グラフのタブ). 項目ごとに 1 つ描き、ViewCountPanel が 3 つを 1 枚のカードに並べる.
 *
 * - 同時接続数のグラフとは時間の軸が違う (開いた時の記録は数日おきのこともある) ので別のグラフにする.
 * - 3 つは連動する: 横軸は全項目の記録の範囲に揃え、マウスを乗せた時刻 (hoverT) は親で共有する.
 * - 縦軸は増えるだけの値なので、0 からではなく記録の範囲に合わせる (変化が見えるように).
 */
import { format, startOfDay } from 'date-fns'
import { computed } from 'vue'
import { hmsString } from '../../lib/util/format'
import type { ViewCountPoint, ViewMetric } from '../../models/Timeline'

const props = defineProps<{
  points: ViewCountPoint[] // 全項目の記録 (横軸を揃えるため、項目が読めなかった記録も渡す)
  metric: ViewMetric // 描く項目
  startDate?: Date // 配信開始 (経過時間の表示用)
}>()

/** マウスを乗せている記録の時刻 (3 つのグラフで共有する). */
const hoverT = defineModel<number>('hoverT')

/** 選んだ項目の記録 (その項目が読めなかった記録は除く). */
const series = computed(() => {
  const key = props.metric.key
  return props.points.flatMap(p => (p[key] === undefined ? [] : [{ t: p.t, value: p[key] as number }]))
})

// 控えめな線・文字の色 (zinc)
const GRID_COLOR = '#f4f4f5' // zinc-100
const AXIS_COLOR = '#d4d4d8' // zinc-300
const MUTED_TEXT = '#71717a' // zinc-500

const WIDTH = 540
const PLOT_LEFT = 40
const PLOT_RIGHT = 10
const PLOT_TOP = 6
const PLOT_HEIGHT = 72
const X_AXIS_HEIGHT = 16
const plotBottom = PLOT_TOP + PLOT_HEIGHT
const HEIGHT = plotBottom + X_AXIS_HEIGHT
const plotWidth = WIDTH - PLOT_LEFT - PLOT_RIGHT

/** 横軸 (記録した最初 〜 最後. 1 点だけなら真ん中). */
const xRange = computed(() => {
  const start = props.points[0]?.t ?? Date.now()
  const end = props.points.at(-1)?.t ?? start
  return { start, end }
})
function x(t: number): number {
  const { start, end } = xRange.value
  if (end === start) return PLOT_LEFT + plotWidth / 2
  return PLOT_LEFT + ((t - start) / (end - start)) * plotWidth
}

const compact = new Intl.NumberFormat('ja-JP', { notation: 'compact', maximumFractionDigits: 1 })

/** 1, 2, 5 × 10^n の刻み. */
function niceStep(span: number): number {
  if (span <= 0) return 1
  const raw = span / 2
  const base = 10 ** Math.floor(Math.log10(raw))
  return [1, 2, 5, 10].map(m => m * base).find(v => v >= raw) ?? raw
}

/** 縦軸の範囲 (切りのいい値に広げる). */
const yRange = computed(() => {
  const values = series.value.length ? series.value.map(p => p.value) : [0]
  const lo = Math.min(...values)
  const hi = Math.max(...values)
  const step = niceStep(hi - lo || hi * 0.1 || 1)
  const min = Math.max(0, Math.floor(lo / step) * step)
  const max = Math.max(min + step, Math.ceil(hi / step) * step)
  return { min, max, step }
})
const yMin = computed(() => yRange.value.min)
function y(value: number): number {
  const { min, max } = yRange.value
  return plotBottom - ((value - min) / (max - min)) * PLOT_HEIGHT
}
const yTicks = computed(() => {
  const { min, max, step } = yRange.value
  if (series.value.length === 0) return [{ value: min, y: y(min), label: '0' }]
  const ticks = []
  for (let v = min; v <= max + step / 2; v += step) ticks.push({ value: v, y: y(v), label: compact.format(v) })
  return ticks
})

const linePath = computed(() => series.value.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.value).toFixed(1)}`).join(''))

/** 目盛りの文字の幅の目安 ("2026/11/23 21:10" が 10px の文字で 80 くらい). 間引き・はみ出しの判定に使う. */
const X_LABEL_WIDTH = 96
const MINUTE = 60 * 1000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
/** 目盛りの間隔の候補 (切りのいい時間). */
const X_STEPS = [1, 2, 5, 10, 15, 30].map(m => m * MINUTE)
  .concat([1, 2, 3, 6, 12].map(h => h * HOUR))
  .concat([1, 2, 7, 14, 30, 60, 90, 180, 365].map(d => d * DAY))

/**
 * 時刻の目盛り: 切りのいい時刻 (その日の 0 時から数えて間隔の倍数) に置き、文字が重ならない数に間引く.
 * 年月日を出し、間隔が 1 日より短い時は時刻も出す. 数日にまたがるので配信開始からの時間は出さない.
 */
const xTicks = computed(() => {
  const { start, end } = xRange.value
  if (end === start) return [{ t: start, x: x(start), label: format(start, 'yyyy/M/d H:mm'), anchor: 'middle' }]
  const maxCount = Math.max(2, Math.floor(plotWidth / X_LABEL_WIDTH))
  const step = X_STEPS.find(s => (end - start) / s <= maxCount) ?? X_STEPS.at(-1)!
  const pattern = step < DAY ? 'yyyy/M/d H:mm' : 'yyyy/M/d'
  const base = startOfDay(start).getTime()
  const ticks = []
  for (let t = base + Math.ceil((start - base) / step) * step; t <= end; t += step) {
    const tx = x(t)
    // 端からはみ出すものは出さない
    if (tx - X_LABEL_WIDTH / 2 < 0 || tx + X_LABEL_WIDTH / 2 > WIDTH) continue
    ticks.push({ t, x: tx, label: format(t, pattern), anchor: 'middle' })
  }
  return ticks
})

/// マウスを乗せた時 ///

/** マウスを乗せた時刻のこの項目の値 (読めていなければ無い). */
const hoverValue = computed(() => props.points.find(p => p.t === hoverT.value)?.[props.metric.key])

/** マウスの位置に一番近い記録を選ぶ (全項目の記録から選ぶので、3 つのグラフで同じ時刻になる). */
function handlePointer(event: PointerEvent): void {
  if (props.points.length === 0) return
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const px = ((event.clientX - rect.left) / rect.width) * WIDTH
  let best = props.points[0].t
  for (const p of props.points) {
    if (Math.abs(x(p.t) - px) < Math.abs(x(best) - px)) best = p.t
  }
  hoverT.value = best
}

const tooltipStyle = computed(() => {
  if (hoverT.value === undefined) return {}
  const ratio = x(hoverT.value) / WIDTH
  return ratio > 0.55 ? { right: `${(1 - ratio) * 100 + 3}%` } : { left: `${ratio * 100 + 3}%` }
})

function formatTime(t: number): string {
  return format(t, 'yyyy-MM-dd HH:mm')
}

/** 配信開始からの経過時間. */
function elapsed(t: number): string | undefined {
  const start = props.startDate?.getTime()
  return start === undefined || t < start ? undefined : hmsString((t - start) / 1000)
}
</script>
