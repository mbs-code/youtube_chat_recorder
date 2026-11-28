<template>
  <!-- 再生数・高評価・コメント数: 1 枚のカードに 3 つのグラフ (連動) と、同じ記録の表を入れる -->
  <section class="card flex flex-col gap-2.5 px-3 py-2.5">
    <ViewCountChart
      v-for="metric in VIEW_METRICS"
      :key="metric.key"
      v-model:hover-t="hoverT"
      :points="points"
      :metric="metric"
      :start-date="startDate"
    />

    <details v-if="points.length" class="text-xs">
      <summary class="cursor-pointer text-zinc-500 select-none">表で見る</summary>
      <div class="mt-1 max-h-48 overflow-y-auto">
        <table class="w-full text-right tabular-nums">
          <thead class="sticky top-0 bg-white text-zinc-500">
            <tr>
              <th class="py-0.5 text-left font-normal">時刻</th>
              <th class="font-normal">配信開始から</th>
              <th v-for="m in VIEW_METRICS" :key="m.key" class="font-normal">{{ m.label }}</th>
            </tr>
          </thead>
          <tbody class="text-zinc-700">
            <tr
              v-for="point in points"
              :key="point.t"
              class="border-t border-zinc-100"
              :class="{ 'bg-zinc-50': hoverT === point.t }"
            >
              <td class="py-0.5 text-left">{{ format(point.t, 'yyyy-MM-dd HH:mm') }}</td>
              <td>{{ elapsed(point.t) ?? '-' }}</td>
              <td v-for="m in VIEW_METRICS" :key="m.key">{{ point[m.key]?.toLocaleString() ?? '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </section>
</template>

<script setup lang="ts">
/**
 * 再生数・高評価数・コメント数の記録 (popup の記録・グラフのタブ).
 *
 * - 同じ記録 (ViewCountPoint) から 3 つのグラフと 1 つの表を作る. マウスを乗せた時刻はグラフ同士で共有する.
 */
import { format } from 'date-fns'
import { ref } from 'vue'
import { hmsString } from '../../lib/util/format'
import type { ViewCountPoint, ViewMetric } from '../../models/Timeline'
import ViewCountChart from './ViewCountChart.vue'

const props = defineProps<{
  points: ViewCountPoint[]
  startDate?: Date // 配信開始 (経過時間の表示用)
}>()

// 色はデータ可視化のパレットから (同接・コメント・スパチャのグラフとは別の色)
const VIEW_METRICS: ViewMetric[] = [
  { key: 'views', label: '再生数', unit: '回', color: '#6250d6' },
  { key: 'likes', label: '高評価', unit: '件', color: '#d9480f' },
  { key: 'commentCount', label: 'コメント', unit: '件', color: '#0c8599' },
]

/** 3 つのグラフでマウスを乗せている時刻. */
const hoverT = ref<number>()

/** 配信開始からの経過時間. */
function elapsed(t: number): string | undefined {
  const start = props.startDate?.getTime()
  return start === undefined || t < start ? undefined : hmsString((t - start) / 1000)
}
</script>
