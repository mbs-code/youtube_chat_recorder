<template>
  <!-- 再生数の記録: 動画を開くたび (配信中は 1 分ごと) に記録した値を線でつなぐ. 時刻は記録した間隔のまま (数日にまたがることもある) -->
  <section v-if="points.length" class="card relative px-3 py-2.5" @mouseleave="hoverIndex = undefined">
    <h3 class="text-xs font-bold text-zinc-700">再生数</h3>
    <svg
      class="block w-full touch-none"
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      role="img"
      aria-label="再生数"
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

      <path
        :d="linePath"
        fill="none"
        :stroke="LINE_COLOR"
        stroke-width="2"
        stroke-linejoin="round"
        stroke-linecap="round"
      />
      <!-- 記録した点 (開いた時だけの記録は間が空くので点も描く. 多い時はマウスを乗せた点だけ) -->
      <circle
        v-for="(point, i) in points"
        v-show="points.length <= 24 || hoverIndex === i"
        :key="point.t"
        :cx="x(point.t)"
        :cy="y(point.views)"
        :r="hoverIndex === i ? 4 : 2.5"
        :fill="LINE_COLOR"
        stroke="white"
        :stroke-width="hoverIndex === i ? 2 : 1"
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
        v-if="hoverPoint"
        :x1="x(hoverPoint.t)"
        :x2="x(hoverPoint.t)"
        :y1="PLOT_TOP"
        :y2="plotBottom"
        :stroke="AXIS_COLOR"
        stroke-width="1"
        stroke-dasharray="3 3"
      />
    </svg>

    <div
      v-if="hoverPoint"
      class="pointer-events-none absolute top-2 z-10 min-w-36 rounded-md border border-zinc-200 bg-white px-2.5 py-1.5 text-xs shadow-md"
      :style="tooltipStyle"
    >
      <p class="font-bold text-zinc-950">{{ formatTime(hoverPoint.t) }}</p>
      <p v-if="elapsed(hoverPoint.t)" class="text-zinc-500">配信開始から {{ elapsed(hoverPoint.t) }}</p>
      <p class="mt-1 flex items-center gap-1.5 text-zinc-700">
        <span class="inline-block h-0.5 w-3 rounded-full" :style="{ backgroundColor: LINE_COLOR }" />
        再生数 <strong class="ml-auto text-zinc-950">{{ hoverPoint.views.toLocaleString() }} 回</strong>
      </p>
    </div>

    <details class="mt-1.5 text-xs">
      <summary class="cursor-pointer text-zinc-500 select-none">表で見る</summary>
      <div class="mt-1 max-h-48 overflow-y-auto">
        <table class="w-full text-right tabular-nums">
          <thead class="sticky top-0 bg-white text-zinc-500">
            <tr>
              <th class="py-0.5 text-left font-normal">時刻</th>
              <th class="font-normal">配信開始から</th>
              <th class="font-normal">再生数</th>
            </tr>
          </thead>
          <tbody class="text-zinc-700">
            <tr v-for="point in points" :key="point.t" class="border-t border-zinc-100">
              <td class="py-0.5 text-left">{{ formatTime(point.t) }}</td>
              <td>{{ elapsed(point.t) ?? '-' }}</td>
              <td>{{ point.views.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
/**
 * 再生数の記録のグラフ (popup の記録・グラフのタブ).
 *
 * - 同時接続数のグラフとは時間の軸が違う (開いた時の記録は数日おきのこともある) ので別のグラフにする.
 * - 再生数は増えるだけなので、縦軸は 0 からではなく記録の範囲に合わせる (変化が見えるように).
 */
import { format } from 'date-fns'
import { computed, ref } from 'vue'
import { hmsString, timeLabel } from '../../lib/util/format'
import type { ViewCountPoint } from '../../models/Timeline'

const props = defineProps<{
  points: ViewCountPoint[]
  startDate?: Date // 配信開始 (経過時間の表示用)
}>()

// 色 (データ可視化の検証済みパレットの 7 番目. 同接・コメント・スパチャと見分けるため) と、控えめな線・文字の色 (zinc)
const LINE_COLOR = '#6250d6'
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
  const values = props.points.map(p => p.views)
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
  const ticks = []
  for (let v = min; v <= max + step / 2; v += step) ticks.push({ value: v, y: y(v), label: compact.format(v) })
  return ticks
})

/** 横軸 (記録した最初 〜 最後. 1 点だけなら真ん中). */
const xRange = computed(() => {
  const start = props.points[0]?.t ?? 0
  const end = props.points.at(-1)?.t ?? start
  return { start, end }
})
function x(t: number): number {
  const { start, end } = xRange.value
  if (end === start) return PLOT_LEFT + plotWidth / 2
  return PLOT_LEFT + ((t - start) / (end - start)) * plotWidth
}

const linePath = computed(() => props.points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t).toFixed(1)},${y(p.views).toFixed(1)}`).join(''))

/** 時刻の目盛り: 両端と間 (1 日以内なら時刻、それ以上は日付). */
const xTicks = computed(() => {
  const { start, end } = xRange.value
  const pattern = end - start < 24 * 60 * 60 * 1000 ? 'H:mm' : 'M/d H:mm'
  const label = (t: number) => timeLabel(t, props.startDate, pattern)
  if (end === start) return [{ t: start, x: x(start), label: label(start), anchor: 'middle' }]
  const count = 3
  return Array.from({ length: count + 1 }, (_, i) => {
    const t = start + ((end - start) * i) / count
    const anchor = i === 0 ? 'start' : i === count ? 'end' : 'middle'
    return { t, x: x(t), label: label(t), anchor }
  })
})

/// マウスを乗せた時 ///

const hoverIndex = ref<number>()
const hoverPoint = computed(() => (hoverIndex.value === undefined ? undefined : props.points[hoverIndex.value]))

/** マウスの位置に一番近い点を選ぶ. */
function handlePointer(event: PointerEvent): void {
  const svg = event.currentTarget as SVGSVGElement
  const rect = svg.getBoundingClientRect()
  const px = ((event.clientX - rect.left) / rect.width) * WIDTH
  let best = 0
  props.points.forEach((p, i) => {
    if (Math.abs(x(p.t) - px) < Math.abs(x(props.points[best].t) - px)) best = i
  })
  hoverIndex.value = best
}

const tooltipStyle = computed(() => {
  if (!hoverPoint.value) return {}
  const ratio = x(hoverPoint.value.t) / WIDTH
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
