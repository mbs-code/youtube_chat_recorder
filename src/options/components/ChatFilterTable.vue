<template>
  <div class="filters">
    <table class="table">
      <thead>
        <tr>
          <th>チャットの種類</th>
          <th class="col-check">保存する</th>
          <th class="col-check">画像化する</th>
          <th class="col-actions"><span class="sr-only">操作</span></th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="chatFilter in chatFilters"
          :key="chatFilter.key"
          :class="{
            'is-editing': chatFilter.key === editFilterKey,
            'is-matched': chatFilter.key === testMatchFilterKey,
          }"
        >
          <td>
            <div class="name">
              <template v-if="chatFilter.textMode">
                <i class="mdi" :class="chatFilter.textMode === 'author' ? 'mdi-account-outline' : 'mdi-message-text-outline'" />
                <span class="match">{{ chatFilter.title }}</span>
                <span class="badge">{{ chatFilter.textMode === 'author' ? '投稿者名' : '本文' }}</span>
                <span v-if="chatFilter.isExact" class="badge is-info">完全一致</span>
                <span v-if="chatFilter.isRegex" class="badge is-warning">正規表現</span>
              </template>
              <template v-else>
                <span>{{ chatFilter.title }}</span>
                <span
                  v-if="warnFilterKeys.includes(chatFilter.key)"
                  class="badge is-warning"
                  title="数が多いため、オンにすると重くなります"
                >
                  負荷注意
                </span>
              </template>
            </div>
          </td>
          <td class="col-check">
            <input
              v-model="chatFilter.doSave"
              type="checkbox"
              class="checkbox"
              :aria-label="`${chatFilter.title} を保存する`"
              :disabled="isEditing"
              @change="!chatFilter.doSave && (chatFilter.doImage = false)"
            />
          </td>
          <td class="col-check">
            <input
              v-model="chatFilter.doImage"
              type="checkbox"
              class="checkbox"
              :aria-label="`${chatFilter.title} を画像化する`"
              :disabled="isEditing"
              @change="chatFilter.doImage && (chatFilter.doSave = true)"
            />
          </td>
          <td class="col-actions">
            <template v-if="chatFilter.textMode">
              <button class="btn btn-ghost is-icon is-small" title="編集" :disabled="isEditing" @click="handleFilterEdit(chatFilter)">
                <i class="mdi mdi-pencil-outline" />
              </button>
              <button
                class="btn btn-ghost is-icon is-small delete"
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
    <div class="block" :class="{ 'is-editing': isEditing }">
      <h3 class="block-title">
        <i class="mdi" :class="isEditing ? 'mdi-pencil-outline' : 'mdi-plus'" />
        {{ isEditing ? 'テキストのマッチングを編集' : 'テキストのマッチングを追加' }}
      </h3>
      <p class="help block-help">特定の人や、特定の言葉を含むチャットを記録できます。</p>

      <div class="row">
        <select v-model="editFilterMode" class="select mode" aria-label="対象">
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
      <div class="row options">
        <label class="check">
          <input v-model="editFilterIsExact" type="checkbox" class="checkbox" @change="editFilterIsExact && (editFilterIsRegex = false)" />
          完全一致
        </label>
        <label class="check">
          <input v-model="editFilterIsRegex" type="checkbox" class="checkbox" @change="editFilterIsRegex && (editFilterIsExact = false)" />
          正規表現
        </label>
      </div>
    </div>

    <!-- マッチングテスト -->
    <div class="block">
      <h3 class="block-title">
        <i class="mdi mdi-flask-outline" />
        マッチングテスト
      </h3>
      <p class="help block-help">文字を入れて Enter を押すと、どの種類に当てはまるかを試せます。</p>
      <div class="row">
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

<style scoped>
.filters {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.table {
  width: 100%;
  border-collapse: collapse;

  & th {
    padding: 8px;
    border-bottom: 1px solid var(--border);
    color: var(--text-muted);
    font-size: 12px;
    font-weight: 500;
    text-align: left;
  }

  & td {
    height: 40px;
    padding: 4px 8px;
    border-bottom: 1px solid var(--border);
  }

  & tbody tr:last-child td {
    border-bottom: none;
  }

  & tbody tr:hover td {
    background: var(--surface-muted);
  }

  & tr.is-editing td {
    background: var(--primary-soft);
  }

  & tr.is-matched td {
    background: var(--success-soft);
  }
}

.col-check {
  width: 76px;
  text-align: center !important;

  & .checkbox {
    vertical-align: middle;
  }
}

.col-actions {
  width: 68px;
  white-space: nowrap;
  text-align: right;
}

.name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--text-strong);

  & > .mdi {
    color: var(--text-muted);
  }
}

.match {
  font-weight: 500;
  word-break: break-all;
}

.delete:hover:enabled {
  background: var(--danger-soft);
  color: var(--danger);
}

.block {
  padding: 14px;
  border: 1px solid var(--border);
  border-radius: 10px;
  background: var(--surface-muted);

  &.is-editing {
    border-color: var(--primary-ring);
    background: var(--primary-soft);
  }
}

.block-title {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--text-strong);
  font-size: 13px;
  font-weight: 600;
}

.block-help {
  margin: 2px 0 10px;
}

.row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.mode {
  width: 110px;
  flex-shrink: 0;
}

.options {
  gap: 16px;
  margin-top: 8px;
}

.check {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
}
</style>
