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
            </th>

            <td class="has-text-centered">
              <input
                v-model="chatFilter.doSave"
                type="checkbox"
                :disabled="editFilterKey"
                @change="handleFilterDoSave(chatFilter)"
              />
            </td>

            <td class="has-text-centered">
              <input
                v-model="chatFilter.doImage"
                type="checkbox"
                :disabled="editFilterKey"
                @change="handleFilterDoImage(chatFilter)"
              />
            </td>

            <td class="td-in-button">
              <div v-if="chatFilter.textMode" class="field is-grouped">
                <p class="control">
                  <button
                    class="button is-small is-success is-light has-tooltip-bottom"
                    data-tooltip="編集"
                    :disabled="editFilterKey"
                    @click="handleFilterEdit(chatFilter)"
                  >
                    <span class="icon is-small">
                      <i class="mdi mdi-pencil"></i>
                    </span>
                  </button>
                </p>
                <p class="control">
                  <button
                    class="button is-small is-danger is-light has-tooltip-bottom"
                    data-tooltip="削除"
                    :disabled="editFilterKey"
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

    <hr class="has-background-white">

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
            <input
              ref="editFIlterMatchInput"
              v-model="editFilterMatchText"
              class="input"
              type="text"
              placeholder="マッチング文字列"
            />
          </div>

          <p class="control">
            <button class="button is-link" @click="handleFilterAdd">
              追加
            </button>
          </p>
        </div>
      </div>
    </div>

    <div class="field is-grouped">
      <p class="control">
        <button
          class="button"
          :class="{ 'is-warning': editFilterKey }"
          @click="handleFilterReset"
        >
          クリア
        </button>
      </p>

      <div class="control">
        <label class="checkbox field-into-height">
          <input v-model="editFilterIsExact" type="checkbox" @change="handleFilterIsExact" />
          &nbsp;完全一致
        </label>
      </div>

      <div class="control">
        <label class="checkbox field-into-height">
          <input v-model="editFilterIsRegex" type="checkbox" @change="handleFilterIsRegex" />
          &nbsp;正規表現
        </label>
      </div>
    </div>
    <!-- end add input -->

    <hr>

    <!-- start test input -->
    <div class="field">
      <label class="label">マッチングテスト<small>(Enter で自動)</small></label>
      <div class="control">
        <div class="field is-grouped">
          <div class="control is-expanded">
            <input
              v-model="testMatchText"
              class="input"
              type="text"
              placeholder="コメント \ 投稿者名"
              :disabled="editFilterKey"
              @keydown.enter="handleFilterTest"
            />
          </div>

          <p class="control">
            <button
              class="button is-link is-outlined"
              :disabled="editFilterKey"
              @click="handleFilterTest"
            >
              テスト
            </button>
          </p>
        </div>
      </div>
    </div>
    <!-- end test field -->
  </div>
</template>


<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import ChatFilter from '../../lib/chatFilter/ChatFilter'
import { ChatFilterConfigInterface } from '../../lib/chatFilter/ChatFilterInterface'
import Chat from '../../models/Chat'
import Toast from '../../plugins/Toast'

@Component
export default class ChatFilterTable extends Vue {
  editFilterKey: string | null = null

  editFilterMode: 'message' | 'author' = 'message'
  editFilterMatchText: string = ''
  editFilterIsExact: boolean = false
  editFilterIsRegex: boolean = false

  testMatchFilterKey: string | null = null
  testMatchText: string = ''

  @Prop({ default: [] })
  value!: ChatFilterConfigInterface[]

  // TODO: これで動いてるのかなw
  get chatFilters() {
    return this.value
  }

  $refs!: {
    editFIlterMatchInput: HTMLInputElement,
  }

  handleFilterDoSave(chatFilter: ChatFilterConfigInterface): void {
    if (!chatFilter.doSave) chatFilter.doImage = false
  }

  handleFilterDoImage(chatFilter: ChatFilterConfigInterface): void {
    if (chatFilter.doImage) chatFilter.doSave = true
  }

  handleFilterEdit(chatFilter: ChatFilterConfigInterface): void {
    this.editFilterKey = chatFilter.key
    this.editFilterMatchText = chatFilter.match || ''
    this.editFilterIsExact = chatFilter.isExact || false
    this.editFilterIsRegex = chatFilter.isRegex || false
    this.$refs.editFIlterMatchInput.focus()

    this.testMatchFilterKey = null
  }

  handleFilterDelete(chatFilter: ChatFilterConfigInterface): void {
    // 存在するなら削除する
    const findIndex = this.chatFilters.findIndex(c => c.key === chatFilter.key)
    if (findIndex >= 0) {
      this.chatFilters.splice(findIndex, 1)
    }
  }

  ///

  handleFilterReset(): void {
    this.editFilterKey = null
    this.editFilterMatchText = ''
    this.editFilterIsExact = false
    this.editFilterIsRegex = false

    this.testMatchFilterKey = null
  }

  handleFilterIsExact(): void {
    if (this.editFilterIsExact) this.editFilterIsRegex = false
  }

  handleFilterIsRegex(): void {
    if (this.editFilterIsRegex) this.editFilterIsExact = false
  }

  handleFilterAdd(): void {
    // テキストが存在するなら実行
    const matchText = this.editFilterMatchText
    if (!matchText) {
      Toast.error('マッチング文字列が空です。')
      return
    }

    const key = this.editFilterKey
    const mode = this.editFilterMode
    const isRegex = this.editFilterIsRegex
    const isExact = this.editFilterIsExact

    // 配列から対象の filter を検索
    const findIndex = this.chatFilters.findIndex(cf => cf.key === key)
    const find = (findIndex >= 0) ? this.chatFilters[findIndex] : undefined

    // 重複チェック
    const duplicate = this.chatFilters.find(cf => {
      return cf.key !== key // キーが一致してるのは上書きするのでスキップ
        && cf.textMode === mode
        && cf.match === matchText
        && cf.isRegex === isRegex
        && cf.isExact === isExact
    })
    if (duplicate) {
      Toast.error('そのフィルタは既に存在します。')
      return
    }

    // フィルターの組み立て
    const filter: ChatFilterConfigInterface = {
      key: find?.key || String(new Date().getTime()),
      title: this.editFilterMatchText,
      doSave: true, // 追加する => 保存はONにしとく
      doImage: false,

      textMode: this.editFilterMode,
      match: matchText,
      isRegex: isRegex,
      isExact: isExact,
    }

    // フィルターの置き換え or 追加
    if (find) {
      this.chatFilters.splice(findIndex, 1, filter)
    } else {
      this.chatFilters.push(filter)
    }

    // 値のリセット (テキストはそのまま)
    this.editFilterKey = null
    this.editFilterMatchText = ''
  }

  handleFilterTest(): void {
    const text = this.testMatchText

    // チャットをインスタンス生成
    const chat = new Chat()
    chat.message = text
    chat.altMessage = text
    chat.authorName = text

    // フィルターをインスタントで作成する
    const cf = new ChatFilter()
    cf.setChatFilters(this.chatFilters)

    // 判定する
    const scf = cf.checkStuckChatFilter(chat)
    if (scf?.filter) {
      Toast.success(`「${scf.filter.title}」に一致しました。(task: ${String(scf?.taskType)})`)
      this.testMatchFilterKey = scf.filter.key
    } else {
      Toast.warn('一致しませんでした。')
      this.testMatchFilterKey = null
    }
  }
}
</script>

<style lang="scss" scoped>
// checkbox を x1.5 に
input[type="checkbox"] {
  margin: 3px;
  transform: scale(1.5);
}

.box {
  box-shadow: none;
  border: solid 1px gainsboro;
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
