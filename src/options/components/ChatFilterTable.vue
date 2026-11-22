<template>
  <div>
    <!-- start filter table -->
    <div class="field">
      <label class="label">チャットフィルター</label>
      <table class="table">
        <thead>
          <tr>
            <th class="has-text-centered">項目</th>
            <th class="has-text-centered">保存する</th>
            <th class="has-text-centered">画像化する</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="chatFilter in chatFilters"
            :key="chatFilter.key"
            :class="{
              'has-background-white-ter': !chatFilter.textMode,
              'is-selected': chatFilter.key === editFilterKey,
              'has-background-link-light': chatFilter.key === testMatchFilterKey,
            }"
          >
            <th>
              <span v-if="chatFilter.textMode === 'message'">💬</span>
              <span v-if="chatFilter.textMode === 'author'">🙋</span>
              <span v-if="chatFilter.textMode" class="tag is-primary is-light">
                <span class="icon is-small">
                  <i class="mdi mdi-format-letter-matches"></i>
                </span>
              </span>
              <span v-if="chatFilter.isExact" class="tag is-link">
                <span class="icon is-small">
                  <i class="mdi mdi-equal"></i>
                </span>
              </span>
              <span v-if="chatFilter.isRegex" class="tag is-warning">
                <span class="icon is-small">
                  <i class="mdi mdi-regex"></i>
                </span>
              </span>
              {{ chatFilter.title }}
              <span v-if="warnFilterKeys.includes(chatFilter.key)" class="has-text-danger">(負荷注意)</span>
            </th>

            <td class="has-text-centered">
              <input
                v-model="chatFilter.doSave"
                type="checkbox"
                :disabled="isEditing"
                @change="!chatFilter.doSave && (chatFilter.doImage = false)"
              />
            </td>

            <td class="has-text-centered">
              <input
                v-model="chatFilter.doImage"
                type="checkbox"
                :disabled="isEditing"
                @change="chatFilter.doImage && (chatFilter.doSave = true)"
              />
            </td>

            <td class="td-in-button">
              <div v-if="chatFilter.textMode" class="field is-grouped">
                <p class="control">
                  <button
                    class="button is-small is-success is-light"
                    title="編集"
                    :disabled="isEditing"
                    @click="handleFilterEdit(chatFilter)"
                  >
                    <span class="icon is-small">
                      <i class="mdi mdi-pencil"></i>
                    </span>
                  </button>
                </p>
                <p class="control">
                  <button
                    class="button is-small is-danger is-light"
                    title="削除"
                    :disabled="isEditing"
                    @click="handleFilterDelete(chatFilter)"
                  >
                    <span class="icon is-small">
                      <i class="mdi mdi-delete"></i>
                    </span>
                  </button>
                </p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <!-- end filter table -->

    <hr class="has-background-white" />

    <!-- start add input -->
    <div class="field">
      <label class="label">テキストのマッチングを追加</label>
      <div class="control">
        <div class="field is-grouped">
          <div class="control">
            <div class="select">
              <select v-model="editFilterMode">
                <option value="message">💬</option>
                <option value="author">🙋</option>
              </select>
            </div>
          </div>

          <div class="control is-expanded">
            <input ref="matchInput" v-model="editFilterMatchText" class="input" type="text" placeholder="マッチング文字列" />
          </div>

          <p class="control">
            <button class="button is-link" @click="handleFilterAdd">{{ isEditing ? '更新' : '追加' }}</button>
          </p>
        </div>
      </div>
    </div>

    <div class="field is-grouped">
      <p class="control">
        <button class="button" :class="{ 'is-warning': isEditing }" @click="handleFilterReset">クリア</button>
      </p>

      <div class="control">
        <label class="checkbox field-into-height">
          <input v-model="editFilterIsExact" type="checkbox" @change="editFilterIsExact && (editFilterIsRegex = false)" />
          &nbsp;完全一致
        </label>
      </div>

      <div class="control">
        <label class="checkbox field-into-height">
          <input v-model="editFilterIsRegex" type="checkbox" @change="editFilterIsRegex && (editFilterIsExact = false)" />
          &nbsp;正規表現
        </label>
      </div>
    </div>
    <!-- end add input -->

    <hr />

    <!-- start test input -->
    <div class="field">
      <label class="label">
        マッチングテスト
        <small>(Enter で自動)</small>
      </label>
      <div class="control">
        <div class="field is-grouped">
          <div class="control is-expanded">
            <input
              v-model="testMatchText"
              class="input"
              type="text"
              placeholder="コメント \ 投稿者名"
              :disabled="isEditing"
              @keydown.enter="handleFilterTest"
            />
          </div>

          <p class="control">
            <button class="button is-link is-outlined" :disabled="isEditing" @click="handleFilterTest">テスト</button>
          </p>
        </div>
      </div>
    </div>
    <!-- end test field -->
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
const editFilterMode = ref<'message' | 'author'>('message')
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
  chatFilters.value = chatFilters.value.filter(cf => cf.key !== chatFilter.key)
}

function handleFilterReset(): void {
  editFilterKey.value = null
  editFilterMatchText.value = ''
  editFilterIsExact.value = false
  editFilterIsRegex.value = false

  testMatchFilterKey.value = null
}

function handleFilterAdd(): void {
  const matchText = editFilterMatchText.value
  if (!matchText) {
    Toast.error('マッチング文字列が空です。')
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
    Toast.error('そのフィルタは既に存在します。')
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
    Toast.success(`「${result.filter.title}」に一致しました。(task: ${String(result.taskType)})`)
    testMatchFilterKey.value = result.filter.key
  } else {
    Toast.warn('一致しませんでした。')
    testMatchFilterKey.value = null
  }
}
</script>

<style scoped>
/* checkbox を x1.5 に */
input[type='checkbox'] {
  margin: 3px;
  transform: scale(1.5);
}

table {
  border-top: solid 2px #dbdbdb;
  border-bottom: solid 1px #dbdbdb;
}

.td-in-button {
  padding: 6px;
}

.field-into-height {
  padding: 10px;
}
</style>
