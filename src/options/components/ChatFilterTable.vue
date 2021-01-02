<template>
  <div>
    <div class="field">
      <table class="table">
        <thead>
          <tr>
            <th>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;項目</th>
            <th class="has-text-centered">保存する</th>
            <th class="has-text-centered">画像化する</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="chatFilter in chatFilters"
            :key="chatFilter.key"
            :class="{ 'is-selected': chatFilter.key === editFilterKey }"
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
              <input v-model="chatFilter.doSave" type="checkbox" @change="handleFilterDoSave(chatFilter)" />
            </td>

            <td class="has-text-centered">
              <input v-model="chatFilter.doImage" type="checkbox" @change="handleFilterDoImage(chatFilter)" />
            </td>

            <td class="td-in-button">
              <div v-if="chatFilter.textMode" class="field is-grouped">
                <p class="control">
                  <button
                    class="button is-small is-success is-light has-tooltip-bottom"
                    data-tooltip="編集"
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
        <button class="button" @click="handleFilterReset">
          リセット
        </button>
      </p>

      <div class="control">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="checkbox">
              <input v-model="editFilterIsExact" type="checkbox" @change="handleFilterIsExact" />
              &nbsp;完全一致
            </label>
          </div>
        </div>
      </div>

      <div class="control">
        <div class="field is-horizontal">
          <div class="field-label is-normal">
            <label class="checkbox">
              <input v-model="editFilterIsRegex" type="checkbox" @change="handleFilterIsRegex" />
              &nbsp;正規表現
            </label>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>


<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import { ChatFilterConfigInterface } from '../../lib/chatFilter/ChatFilterInterface'
import Toast from '../../plugins/Toast'

@Component
export default class ChatFilterTable extends Vue {
  editFilterKey: string | null = null

  editFilterMode: 'message' | 'author' = 'message'
  editFilterMatchText: string = ''
  editFilterIsExact: boolean = false
  editFilterIsRegex: boolean = false

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
</style>
