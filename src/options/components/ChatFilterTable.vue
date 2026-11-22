<template>
  <div class="flex flex-col gap-5">
    <table class="w-full border-collapse">
      <thead>
        <tr class="border-b border-zinc-200 text-left text-xs text-zinc-500 [&>th]:p-2 [&>th]:font-medium">
          <th>チャットの種類</th>
          <th class="w-19 text-center!">保存する</th>
          <th class="w-19 text-center!">画像化する</th>
          <th class="w-17"><span class="sr-only">操作</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-zinc-200">
        <tr
          v-for="chatFilter in chatFilters"
          :key="chatFilter.key"
          class="[&>td]:h-10 [&>td]:px-2 [&>td]:py-1"
          :class="
            chatFilter.key === editFilterKey
              ? 'bg-primary-soft'
              : chatFilter.key === testMatchFilterKey
                ? 'bg-success-soft'
                : 'hover:bg-zinc-50'
          "
        >
          <td>
            <div class="flex flex-wrap items-center gap-1.5 text-zinc-950">
              <template v-if="chatFilter.textMode">
                <i
                  class="mdi text-zinc-500"
                  :class="chatFilter.textMode === 'author' ? 'mdi-account-outline' : 'mdi-message-text-outline'"
                />
                <span class="font-medium break-all">{{ chatFilter.title }}</span>
                <span class="badge">{{ chatFilter.textMode === 'author' ? '投稿者名' : '本文' }}</span>
                <span v-if="chatFilter.isExact" class="badge badge-info">完全一致</span>
                <span v-if="chatFilter.isRegex" class="badge badge-warning">正規表現</span>
              </template>
              <template v-else>
                <span>{{ chatFilter.title }}</span>
                <span
                  v-if="warnFilterKeys.includes(chatFilter.key)"
                  class="badge badge-warning"
                  title="数が多いため、オンにすると重くなります"
                >
                  負荷注意
                </span>
              </template>
            </div>
          </td>
          <td class="text-center">
            <input
              v-model="chatFilter.doSave"
              type="checkbox"
              class="checkbox align-middle"
              :aria-label="`${chatFilter.title} を保存する`"
              :disabled="isEditing"
              @change="!chatFilter.doSave && (chatFilter.doImage = false)"
            />
          </td>
          <td class="text-center">
            <input
              v-model="chatFilter.doImage"
              type="checkbox"
              class="checkbox align-middle"
              :aria-label="`${chatFilter.title} を画像化する`"
              :disabled="isEditing"
              @change="chatFilter.doImage && (chatFilter.doSave = true)"
            />
          </td>
          <td class="text-right whitespace-nowrap">
            <template v-if="chatFilter.textMode">
              <button class="btn btn-ghost btn-icon btn-sm" title="編集" :disabled="isEditing" @click="handleFilterEdit(chatFilter)">
                <i class="mdi mdi-pencil-outline" />
              </button>
              <button
                class="btn btn-ghost btn-icon btn-sm enabled:hover:bg-danger-soft enabled:hover:text-danger"
                title="削除"
                :disabled="isEditing"
                @click="handleFilterDelete(chatFilter)"
              >
                <i class="mdi mdi-delete-outline" />
              </button>
            </template>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- テキストのマッチングを追加 -->
    <div class="rounded-[10px] border p-3.5" :class="isEditing ? 'border-primary-ring bg-primary-soft' : 'border-zinc-200 bg-zinc-50'">
      <h3 class="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-950">
        <i class="mdi" :class="isEditing ? 'mdi-pencil-outline' : 'mdi-plus'" />
        {{ isEditing ? 'テキストのマッチングを編集' : 'テキストのマッチングを追加' }}
      </h3>
      <p class="help mt-0.5 mb-2.5">特定の人や、特定の言葉を含むチャットを記録できます。</p>

      <div class="flex items-center gap-2">
        <select v-model="editFilterMode" class="select w-27.5 shrink-0" aria-label="対象">
          <option value="author">投稿者名</option>
          <option value="message">本文</option>
        </select>
        <input
          ref="matchInput"
          v-model="editFilterMatchText"
          class="input"
          type="text"
          :placeholder="editFilterMode === 'author' ? '例: @youtube' : '例: 初見'"
          @keydown.enter="handleFilterAdd"
        />
        <button class="btn btn-primary" @click="handleFilterAdd">{{ isEditing ? '更新' : '追加' }}</button>
        <button v-if="isEditing" class="btn btn-secondary" @click="handleFilterReset">やめる</button>
      </div>
      <div class="mt-2 flex items-center gap-4 text-[13px]">
        <label class="inline-flex cursor-pointer items-center gap-1.5">
          <input v-model="editFilterIsExact" type="checkbox" class="checkbox" @change="editFilterIsExact && (editFilterIsRegex = false)" />
          完全一致
        </label>
        <label class="inline-flex cursor-pointer items-center gap-1.5">
          <input v-model="editFilterIsRegex" type="checkbox" class="checkbox" @change="editFilterIsRegex && (editFilterIsExact = false)" />
          正規表現
        </label>
      </div>
    </div>

    <!-- マッチングテスト -->
    <div class="rounded-[10px] border border-zinc-200 bg-zinc-50 p-3.5">
      <h3 class="flex items-center gap-1.5 text-[13px] font-semibold text-zinc-950">
        <i class="mdi mdi-flask-outline" />
        マッチングテスト
      </h3>
      <p class="help mt-0.5 mb-2.5">文字を入れて Enter を押すと、どの種類に当てはまるかを試せます。</p>
      <div class="flex items-center gap-2">
        <input
          v-model="testMatchText"
          class="input"
          type="text"
          placeholder="チャットの本文 または 投稿者名"
          :disabled="isEditing"
          @keydown.enter="handleFilterTest"
        />
        <button class="btn btn-secondary" :disabled="isEditing" @click="handleFilterTest">テスト</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useTemplateRef } from 'vue'
import ChatFilter, { warnFilterKeys } from '../../lib/chatFilter/ChatFilter'
import type { ChatFilterConfigInterface } from '../../lib/chatFilter/ChatFilterInterface'
import Chat from '../../models/Chat'
import Toast from '../../plugins/Toast'

/** 編集対象のフィルター配列 (要素の変更は親に直接反映される). */
const chatFilters = defineModel<ChatFilterConfigInterface[]>({ required: true })

const editFilterKey = ref<string | null>(null)
const editFilterMode = ref<'message' | 'author'>('author')
const editFilterMatchText = ref('')
const editFilterIsExact = ref(false)
const editFilterIsRegex = ref(false)

const testMatchFilterKey = ref<string | null>(null)
const testMatchText = ref('')

const matchInput = useTemplateRef<HTMLInputElement>('matchInput')
const isEditing = computed(() => editFilterKey.value !== null)

function handleFilterEdit(chatFilter: ChatFilterConfigInterface): void {
  editFilterKey.value = chatFilter.key
  editFilterMode.value = chatFilter.textMode || 'message'
  editFilterMatchText.value = chatFilter.match || ''
  editFilterIsExact.value = chatFilter.isExact || false
  editFilterIsRegex.value = chatFilter.isRegex || false
  matchInput.value?.focus()

  testMatchFilterKey.value = null
}

function handleFilterDelete(chatFilter: ChatFilterConfigInterface): void {
  if (window.confirm(`「${chatFilter.title}」を削除します。`)) {
    chatFilters.value = chatFilters.value.filter(cf => cf.key !== chatFilter.key)
  }
}

function handleFilterReset(): void {
  editFilterKey.value = null
  editFilterMatchText.value = ''
  editFilterIsExact.value = false
  editFilterIsRegex.value = false

  testMatchFilterKey.value = null
}

function handleFilterAdd(): void {
  const matchText = editFilterMatchText.value.trim()
  if (!matchText) {
    Toast.error('マッチングする文字を入力してください。')
    return
  }

  const key = editFilterKey.value
  const mode = editFilterMode.value
  const isRegex = editFilterIsRegex.value
  const isExact = editFilterIsExact.value

  if (isRegex) {
    try {
      new RegExp(matchText)
    } catch {
      Toast.error('正規表現が正しくありません。')
      return
    }
  }

  // 重複チェック (編集中のものは上書きするので除外)
  const duplicate = chatFilters.value.find(
    cf =>
      cf.key !== key && cf.textMode === mode && cf.match === matchText && Boolean(cf.isRegex) === isRegex && Boolean(cf.isExact) === isExact
  )
  if (duplicate) {
    Toast.error('同じ条件が既にあります。')
    return
  }

  const editing = chatFilters.value.find(cf => cf.key === key)
  const filter: ChatFilterConfigInterface = {
    key: editing?.key || String(Date.now()),
    title: matchText,
    doSave: editing?.doSave ?? true, // 追加時は保存を ON にしておく
    doImage: editing?.doImage ?? false,
    textMode: mode,
    match: matchText,
    isRegex,
    isExact,
  }

  chatFilters.value = editing ? chatFilters.value.map(cf => (cf.key === editing.key ? filter : cf)) : [...chatFilters.value, filter]
  Toast.success(editing ? `「${matchText}」を更新しました。` : `「${matchText}」を追加しました。画面下の「保存する」で確定してください。`)

  // 値のリセット (オプションはそのまま)
  editFilterKey.value = null
  editFilterMatchText.value = ''
}

function handleFilterTest(): void {
  const text = testMatchText.value

  const chat = new Chat()
  chat.message = text
  chat.altMessage = text
  chat.authorName = text

  const cf = new ChatFilter()
  cf.setChatFilters(chatFilters.value)

  const result = cf.checkStuckChatFilter(chat)
  if (result?.filter) {
    const task = result.taskType === 'image' ? '画像化する' : '保存する'
    Toast.success(`「${result.filter.title}」に当てはまりました。(${task})`)
    testMatchFilterKey.value = result.filter.key
  } else {
    Toast.warn('どの種類にも当てはまりませんでした。')
    testMatchFilterKey.value = null
  }
}
</script>
