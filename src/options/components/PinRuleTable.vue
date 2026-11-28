<template>
  <div class="flex flex-col gap-5">
    <!-- 対象の一覧. 編集・削除ボタン付き -->
    <table class="w-full border-collapse">
      <thead>
        <tr class="border-b border-zinc-200 text-left text-xs text-zinc-500 [&>th]:p-2 [&>th]:font-medium">
          <th>ピン止めする動画</th>
          <th class="w-17"><span class="sr-only">操作</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-200">
        <tr v-if="!rules.length">
          <td colspan="2" class="p-2 text-[13px] text-zinc-500">条件はありません。</td>
        </tr>
        <tr
          v-for="rule in rules"
          :key="rule.key"
          class="[&>td]:h-10 [&>td]:px-2 [&>td]:py-1"
          :class="rule.key === editKey ? 'bg-primary-soft' : 'hover:bg-zinc-50'"
        >
          <td>
            <div class="flex flex-wrap items-center gap-1.5 text-zinc-950">
              <i class="mdi text-zinc-500" :class="rule.target === 'channelName' ? 'mdi-account-outline' : 'mdi-video-outline'" />
              <span class="font-medium break-all">{{ rule.match }}</span>
              <span class="badge">{{ rule.target === 'channelName' ? 'チャンネル名' : 'タイトル' }}</span>
              <span v-if="rule.isExact" class="badge badge-info">完全一致</span>
              <span v-if="rule.isRegex" class="badge badge-warning">正規表現</span>
            </div>
          </td>
          <td class="text-right whitespace-nowrap">
            <button class="btn btn-ghost btn-icon btn-sm" title="編集" :disabled="isEditing" @click="handleEdit(rule)">
              <i class="mdi mdi-pencil-outline" />
            </button>
            <button
              class="btn btn-ghost btn-icon btn-sm enabled:hover:bg-danger-soft enabled:hover:text-danger"
              title="削除"
              :disabled="isEditing"
              @click="handleDelete(rule)"
            >
              <i class="mdi mdi-delete-outline" />
            </button>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- 条件を追加 -->
    <div class="rounded-[10px] border p-3.5" :class="isEditing ? 'border-primary-ring bg-primary-soft' : 'border-zinc-200 bg-zinc-50'">
      <h3 class="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-950">
        <i class="mdi" :class="isEditing ? 'mdi-pencil-outline' : 'mdi-plus'" />
        {{ isEditing ? '条件を編集' : '条件を追加' }}
      </h3>
      <p class="help mt-0.5 mb-2.5">特定のチャンネルや、特定の言葉を含むタイトルの動画を、自動でピン止めします。</p>

      <div class="flex items-center gap-2">
        <select v-model="editTarget" class="select w-34 shrink-0" aria-label="対象">
          <option value="channelName">チャンネル名</option>
          <option value="title">タイトル</option>
        </select>
        <input
          ref="matchInput"
          v-model="editMatchText"
          class="input"
          type="text"
          :placeholder="editTarget === 'channelName' ? '例: Youtube Japan' : '例: 歌枠'"
          @keydown.enter="handleAdd"
        >
        <button class="btn btn-primary" @click="handleAdd">{{ isEditing ? '更新' : '追加' }}</button>
        <button v-if="isEditing" class="btn btn-secondary" @click="handleReset">やめる</button>
      </div>
      <div class="mt-2 flex items-center gap-4 text-[13px]">
        <label class="inline-flex cursor-pointer items-center gap-1.5">
          <input v-model="editIsExact" type="checkbox" class="checkbox" @change="editIsExact && (editIsRegex = false)">
          完全一致
        </label>
        <label class="inline-flex cursor-pointer items-center gap-1.5">
          <input v-model="editIsRegex" type="checkbox" class="checkbox" @change="editIsRegex && (editIsExact = false)">
          正規表現
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * 設定画面の「自動でピン止めする動画」.
 *
 * - 上: 対象の条件の一覧 (編集・削除). 下: 条件の入力欄. 「記録するチャット」(ChatFilterTable) と同じ作り.
 * - 変更は v-model の配列に直接反映する (保存は親の「保存する」で行う).
 */
import { computed, ref, useTemplateRef } from 'vue'
import type { PinRule } from '../../lib/util/PinRule'
import Toast from '../../plugins/Toast'

const rules = defineModel<PinRule[]>({ required: true })

/** 編集中の条件の key (null なら新規追加). */
const editKey = ref<string | null>(null)
const editTarget = ref<PinRule['target']>('channelName')
const editMatchText = ref('')
const editIsExact = ref(false)
const editIsRegex = ref(false)

const matchInput = useTemplateRef<HTMLInputElement>('matchInput')
/** 編集中か (編集中は一覧の編集・削除を触れないようにする). */
const isEditing = computed(() => editKey.value !== null)

/** 一覧の「編集」: 入力欄にその条件の内容を入れる. */
function handleEdit(rule: PinRule): void {
  editKey.value = rule.key
  editTarget.value = rule.target
  editMatchText.value = rule.match
  editIsExact.value = rule.isExact
  editIsRegex.value = rule.isRegex
  matchInput.value?.focus()
}

/** 一覧の「削除」: 確認してから消す. */
function handleDelete(rule: PinRule): void {
  if (window.confirm(`「${rule.match}」を削除します。`)) {
    rules.value = rules.value.filter(r => r.key !== rule.key)
  }
}

/** 入力欄を空に戻す (編集をやめる). */
function handleReset(): void {
  editKey.value = null
  editMatchText.value = ''
  editIsExact.value = false
  editIsRegex.value = false
}

/** 「追加」「更新」: 入力内容を確認し、条件を追加 (または置き換え) する. */
function handleAdd(): void {
  const match = editMatchText.value.trim()
  if (!match) {
    Toast.error('マッチングする文字を入力してください。')
    return
  }

  const key = editKey.value
  const target = editTarget.value
  const isRegex = editIsRegex.value
  const isExact = editIsExact.value

  if (isRegex) {
    try {
      new RegExp(match)
    } catch {
      Toast.error('正規表現が正しくありません。')
      return
    }
  }

  // 重複チェック (編集中のものは上書きするので除外)
  const duplicate = rules.value.find(r =>
    r.key !== key && r.target === target && r.match === match && r.isRegex === isRegex && r.isExact === isExact,
  )
  if (duplicate) {
    Toast.error('同じ条件が既にあります。')
    return
  }

  const editing = rules.value.find(r => r.key === key)
  const rule: PinRule = { key: editing?.key || String(Date.now()), target, match, isExact, isRegex }

  rules.value = editing ? rules.value.map(r => (r.key === editing.key ? rule : r)) : [...rules.value, rule]
  Toast.success(editing ? `「${match}」を更新しました。` : `「${match}」を追加しました。画面下の「保存する」で確定してください。`)

  // 値のリセット (オプションはそのまま)
  editKey.value = null
  editMatchText.value = ''
}
</script>
