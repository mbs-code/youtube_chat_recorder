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
              <ChatFilterTable v-model="chatFilters" />
            </div>
          </div>
        </div>

        <div class="field">
          <div class="notification">
            ※ <strong>「保存する」「画像化する」を選択する</strong>と処理されます。
            <br>
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

        <div class="field is-grouped">
          <p class="control">
            <label class="label field-into-height">出力するログレベル</label>
          </p>
          <div class="control">
            <div class="select">
              <select v-model="showLogLevel">
                <option v-for="level of logLevels" :key="level.name" :value="level.name">
                  {{ level.name.toUpperCase() }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="field is-grouped">
          <p class="control">
            <label class="label field-into-height">ストレージ使用量</label>
          </p>
          <div class="control">
            <p class="field-into-height">{{ byteInUse | formatByte }}</p>
          </div>
        </div>

      </div>
      <!-- end right panel -->
    </div>

  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import ChatFilterTable from './components/ChatFilterTable.vue'
import displayFilter from '../filters/displayFilter'

import ConfigStorage from '../lib/chrome/Configstorage'
import Toast from '../plugins/Toast'
import Config from '../models/Config'
import Runtime from '../lib/chrome/Runtime'
import { ChatFilterConfigInterface } from '../lib/chatFilter/ChatFilterInterface'
import { LogLevel, LEVELS } from '../loggers/Logger'

@Component({
  components: { ChatFilterTable },
  filters: displayFilter,
})
export default class App extends Vue {
  version?: string | null = null
  byteInUse: number = 0

  config?: Config | null = null

  // 初期値は適当 (絶対に上書きするので)
  chatFilters: ChatFilterConfigInterface[] = []
  mergeImageFileName: string = ''
  complementImage: boolean = false
  maxVideoLength: number = 0

  logLevels = LEVELS
  showLogLevel: LogLevel = 'info'

  async mounted(): Promise<void> {
    // manifest を読み込む
    // TODO: 動いてないかも
    const manifest = Runtime.getManifest()
    this.version = manifest.version

    // 使用サイズを取得
    this.byteInUse = await Runtime.getBytesInUseLocalStorage()

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
    this.showLogLevel = config.showLogLevel
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

.field-into-height {
  padding: 10px;
}
</style>
