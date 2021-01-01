<template>
  <section class="section">
    <h1 class="title">
      Youtube Chat Recorder
      <span class="subtitle is-4">{{ version }}</span>
    </h1>
    <h2 class="subtitle">つべくんのチャットをあれこれするやつ</h2>

    <div class="field">
      <div class="notification is-link is-light">
        開いているYouTubeのページに適用させる場合は、その<strong>ページを更新</strong>してください。
      </div>
    </div>

    <div class="field is-grouped">
      <p class="control">
        <a class="button is-primary" @click="handleSave">
          保存する
        </a>
      </p>
      <p class="control">
        <a class="button" @click="handleReset">
          リセット
        </a>
      </p>
    </div>

    <hr> <!-- //////////////////////////////////////////////////////////// -->

    <div v-if="config" class="columns is-desktop">
      <!-- start left panel -->
      <div class="column">
        <div class="field">
          <label class="label">チャットの処理設定</label>
          <div class="control">
            <div class="box">
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
                  <tr v-for="chatFilter in chatFilters" :key="chatFilter.key">
                    <th>
                      <span v-if="chatFilter.textMode === 'message'">💬</span>
                      <span v-if="chatFilter.textMode === 'author'">🙋</span>
                      <span v-if="chatFilter.isExact" class="tag is-link">
                        <span class="icon is-small">
                          <i class="mdi mdi-equal" />
                        </span>
                      </span>
                      <span v-if="chatFilter.isRegex" class="tag is-warning">
                        <span class="icon is-small">
                          <i class="mdi mdi-regex" />
                        </span>
                      </span>
                      {{ chatFilter.title }}
                    </th>
                    <td class="has-text-centered">
                      <input v-model="chatFilter.doSave" type="checkbox" @change="handleDoSave(chatFilter)" />
                    </td>
                    <td class="has-text-centered">
                      <input v-model="chatFilter.doImage" type="checkbox" @change="handleDoImage(chatFilter)" />
                    </td>
                    <td style="padding: 6px;">
                      <div class="field is-grouped">
                        <p class="control">
                          <button class="button is-small is-success is-light" @click="handleFilterEdit(chatFilter)">
                            <span class="icon is-small">
                              <i class="mdi mdi-pencil"></i>
                            </span>
                          </button>
                        </p>
                        <p class="control">
                          <button class="button is-small is-danger is-light" @click="handleFilterDelete(chatFilter)">
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

              <div class="field">
                <label class="label">テキストのマッチングを追加</label>
                <div class="control">
                  <div class="field is-grouped">
                    <div class="control">
                      <div class="select">
                        <select v-model="addFilterMode">
                          <option value="message">💬</option>
                          <option value="author">🙋</option>
                        </select>
                      </div>
                    </div>
                    <div class="control is-expanded">
                      <input
                        ref="addFilterInput"
                        v-model="addFilterText"
                        class="input"
                        type="text"
                        placeholder="マッチング文字列"
                      />
                    </div>
                    <p class="control">
                      <button class="button is-link" @click="handleAddTextFilter">
                        追加
                      </button>
                    </p>
                  </div>
                </div>
              </div>

              <div class="field is-grouped">
                <p class="control">
                  <button class="button" @click="handleAddReset">
                    リセット
                  </button>
                </p>
                <div class="control">
                  <div class="field is-horizontal">
                    <div class="field-label is-normal">
                      <label class="checkbox">
                        <input v-model="addFilterExact" type="checkbox" @change="handleAddExact" />
                        &nbsp;完全一致
                      </label>
                    </div>
                  </div>
                </div>
                <div class="control">
                  <div class="field is-horizontal">
                    <div class="field-label is-normal">
                      <label class="checkbox">
                        <input v-model="addFilterRegex" type="checkbox" @change="handleAddRegex" />
                        &nbsp;正規表現
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="field">
          <div class="notification">
            ※ 「画像化する」は負荷が高い＆容量を食うので加減して使用してください。( 1枚10KBくらい )
            <br>
            ※ 後から画像化するにはもう一度動画チャットを読み込む必要があります。
          </div>
        </div>

      </div>
      <!-- end left panel -->

      <!-- start right panel -->
      <div class="column">
        <div class="field">
          <label class="label">結合後の画像ファイル名</label>
          <div class="control">
            <div class="field has-addons">
              <p class="control is-expanded">
                <input
                  v-model="mergeImageFileName"
                  class="input"
                  type="text"
                  name="mergeImageFileName"
                  :placeholder="config.mergeImageFileName"
                >
              </p>
              <p class="control">
                <a class="button is-static">
                  .png
                </a>
              </p>
            </div>
          </div>
        </div>

        <div class="field">
          <label class="checkbox">
            <input v-model="complementImage" type="checkbox" />
            &nbsp;取得できていないチャット画像を独自に生成する
          </label>
        </div>

        <div class="field">
          <div class="notification">
            <code>%title%</code>: 動画のタイトル, <code>%id%</code>: 動画のID, <code>%count%</code>: 結合するチャットの数, 
            <code>%now%</code>: 現在時刻, <code>%upload%</code>: 動画の投稿時刻
            <br>
            ※ 時刻系のフォーマットは<code>%now(yyyy-MM-dd_HH_mm_ss)%</code>のように括弧を使用して指定可能。
            <br>
            ※ 詳しくはリンク先を参照:
            <a href="https://date-fns.org/v2.16.0/docs/format" target="_blank">
              <span class="icon is-small"><i class="mdi mdi-link-variant" /></span>
              date-fns/format
            </a>
            <br>
            ※ 禁則文字は勝手にエスケープします。
          </div>
        </div>

        <div class="field">
          <label class="label">動画の最大保存数(最低 5)</label>
          <div class="control">
            <input
              v-model="maxVideoLength"
              class="input"
              type="number"
              name="maxVideoLength"
              min="5"
              :placeholder="config.maxVideoLength"
            >
          </div>
        </div>

      </div>
      <!-- end right panel -->
    </div>

  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import ConfigStorage from '../lib/chrome/Configstorage'
import Toast from '../plugins/Toast'
import Config from '../models/Config'
import { ChatConfigFilterInterface } from '../configs/ChatFilters'
import Runtime from '../lib/chrome/Runtime'

@Component
export default class App extends Vue {
  version?: string | null = null
  config?: Config | null = null

  addFilterKey: string | null = null
  addFilterMode: 'message' | 'author' = 'message'
  addFilterText: string = ''
  addFilterRegex: boolean = false
  addFilterExact: boolean = false

  // 初期値は適当 (絶対に上書きするので)
  chatFilters: ChatConfigFilterInterface[] = []
  mergeImageFileName: string = ''
  complementImage: boolean = false
  maxVideoLength: number = 0

  $refs!: {
    addFilterInput: HTMLInputElement,
  }

  async mounted(): Promise<void> {
    // manifest を読み込む
    // TODO: 動いてないかも
    const manifest = Runtime.getManifest()
    this.version = manifest.version

    // 設定の読み込み
    await this.loadConfig()
  }

  async loadConfig(): Promise<void> {
    const config = await ConfigStorage.get()
    this.config = config

    this.chatFilters = config.chatFilters
    this.mergeImageFileName = config.mergeImageFileName
    this.complementImage = config.complementImage
    this.maxVideoLength = config.maxVideoLength
  }

  async handleSave(): Promise<void> {
    // 新しい config に値を追加していく (空白なら前の値)
    const config = new Config()
    config.chatFilters = this.chatFilters
    config.mergeImageFileName = this.mergeImageFileName || config.mergeImageFileName
    config.complementImage = this.complementImage
    config.maxVideoLength = this.maxVideoLength

    // リミット確認
    if (config.maxVideoLength < 5) {
      config.maxVideoLength = 5
      Toast.error('動画の最大保存数は 5 以上です。')
    }

    // 保存する
    await ConfigStorage.save(config)
    Toast.success('設定を保存しました。')

    // 再読み込み
    await this.loadConfig()
  }

  async handleReset(): Promise<void> {
    const result = window.confirm('設定を初期化します。')
    if (result) {
      // config を消して再読み込み
      await ConfigStorage.clear()
      Toast.success('設定をリセットしました。')

      await this.loadConfig()
    }
  }

  ///

  handleFilterEdit(filter: ChatConfigFilterInterface): void {
    this.addFilterKey = filter.key
    this.addFilterMode = filter.textMode || 'message'
    this.addFilterText = filter.match || ''
    this.addFilterRegex = filter.isRegex || false
    this.addFilterExact = filter.isExact || false

    this.$refs.addFilterInput.focus()
  }

  handleFilterDelete(filter: ChatConfigFilterInterface): void {
    const findIndex = this.chatFilters.findIndex(c => c.key === filter.key)
    if (findIndex >= 0) {
      this.chatFilters.splice(findIndex, 1)
    }
  }

  handleAddReset(): void {
    this.addFilterKey = null
    this.addFilterText = ''
  }

  handleAddTextFilter(): void {
    // フィルターを追加する
    let text = this.addFilterText
    if (text) {
      // 優先度は regex > exact
      let mode = this.addFilterMode
      let isRegex = this.addFilterRegex
      let isExact = this.addFilterExact

      // キーの重複を検索する
      const findIndex = this.chatFilters.findIndex(c => c.key === this.addFilterKey)
      if (findIndex === -1) {
        // キーが無いなら重複チェック
        const find = this.chatFilters.find(c => {
          return c.textMode === mode && c.match === text && c.isRegex === isRegex && c.isExact === isExact
        })
        if (find) {
          Toast.error('そのフィルタは既に存在します。')
          return
        }
      }

      const filter: ChatConfigFilterInterface = {
        key: String(new Date().getTime()),
        title: text,
        doSave: false,
        doImage: false,

        textMode: mode,
        match: text,
        isRegex: isRegex,
        isExact: isExact,
      }

      // 置き換えか保存
      if (findIndex) {
        this.chatFilters.splice(findIndex, 1, filter);
      } else {
        this.chatFilters.push()
      }

      this.handleAddReset()
    }
  }

  handleAddExact(): void {
    if (this.addFilterExact) this.addFilterRegex = false
  }

  handleAddRegex(): void {
    if (this.addFilterRegex) this.addFilterExact = false
  }

  handleDoSave(chatFilter: ChatConfigFilterInterface): void {
    // save が false なら image も false にする
    if (!chatFilter.doSave) chatFilter.doImage = false
  }

  handleDoImage(chatFilter: ChatConfigFilterInterface): void {
    // image が true なら save も true にする
    if (chatFilter.doImage) chatFilter.doSave = true
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
</style>
