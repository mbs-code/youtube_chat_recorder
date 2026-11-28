<template>
  <!-- 自動でピン止めする動画の条件の一覧 (どれかに当てはまれば対象). 行ごとに 見る場所・一致のさせ方・文字 を指定する -->
  <div class="flex flex-col gap-2">
    <p v-if="!rules.length" class="help">条件はありません。</p>
    <div v-for="(rule, i) in rules" :key="i" class="flex flex-wrap items-center gap-2">
      <select v-model="rule.target" class="select" :aria-label="`条件 ${i + 1} の対象`">
        <option value="channelName">チャンネル名</option>
        <option value="title">動画のタイトル</option>
      </select>
      <select v-model="rule.mode" class="select" :aria-label="`条件 ${i + 1} の一致のさせ方`">
        <option value="text">テキストを含む</option>
        <option value="regex">正規表現</option>
      </select>
      <input
        v-model="rule.pattern"
        class="input min-w-40 flex-1"
        :class="{ 'border-danger': !PinRuleMatcher.isValid(rule) }"
        type="text"
        :placeholder="rule.mode === 'regex' ? '例: ^【歌枠】' : '例: 歌枠'"
        :aria-label="`条件 ${i + 1} の文字`"
      >
      <button class="btn btn-ghost btn-icon" title="この条件を削除" @click="remove(i)">
        <i class="mdi mdi-delete-outline" />
      </button>
    </div>
    <div>
      <button class="btn btn-secondary btn-sm" @click="add">
        <i class="mdi mdi-plus" />
        条件を追加
      </button>
    </div>
    <p class="help">
      最近見た動画に <strong>初めて</strong> 追加された時、どれかの条件に当てはまると、自動で削除しない (ピン止め) 動画にします。
      大文字小文字は区別しません。あとからピン止めを外した動画は、また見てもピン止めしません。
    </p>
  </div>
</template>

<script setup lang="ts">
/** 自動でピン止めする条件 (チャンネル名か動画のタイトルを、テキストか正規表現で照合する). */
import PinRuleMatcher, { type PinRule } from '../../lib/util/PinRule'

const rules = defineModel<PinRule[]>({ required: true })

function add(): void {
  rules.value = [...rules.value, { target: 'channelName', mode: 'text', pattern: '' }]
}

function remove(index: number): void {
  rules.value = rules.value.filter((_, i) => i !== index)
}
</script>
