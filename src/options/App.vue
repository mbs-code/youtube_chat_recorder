<template>
  <section class="section">
    <div class="columns is-flex">
      <div class="column is-flex-grow-1">
        <h1 class="title">
          Youtube Chat Recorder
          <span class="subtitle is-4">{{ version }}</span>
        </h1>
        <h2 class="subtitle">つべくんのチャットをあれこれするやつ</h2>
      </div>
      <div v-if="FORM_URL" class="column is-flex-grow-0">
        <a class="button is-link is-outlined full-height" :href="FORM_URL" target="_blank">
          <span class="icon">
            <i class="mdi mdi-inbox-arrow-down" />
          </span>
          <span>目安箱</span>
        </a>
      </div>
    </div>

    <div class="field">
      <div class="notification is-warning is-light">
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
      <p class="control">
        <a class="button is-success is-outlined" @click="handleReadme">
          使い方
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
            ※ 後から画像化するにはもう一度動画を再生してチャットを流す必要があります。
          </div>
        </div>

      </div>
      <!-- end left panel -->

      <!-- start right panel -->
      <div class="column">
        <div class="field">
          <label class="label">動画の保存設定</label>
        </div>

        <div class="box">
          <div class="field">
            <label class="checkbox">
              <input v-model="ignoreSimpleVideo" type="checkbox" />
              &nbsp;チャットが無い動画を無視する
            </label>
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

        <div class="field">
          <div class="notification">
            ※ 最大値を超えた場合、参照していない動画とチャットが削除されます。
            <br>
            　 適度に大きい値にするか、予め画像の保存などを行ってください。
          </div>
        </div>

        <div class="field">
          <label class="label">チャットの保存設定</label>
        </div>

        <div class="box">
          <div class="field">
            <label class="checkbox">
              <input v-model="chatDrawOnce" type="checkbox" />
              &nbsp;一度取得した画像は再取得しない
            </label>
          </div>

          <div class="field">
            <label class="checkbox">
              <input v-model="captureInitialChats" type="checkbox" />
              &nbsp;初めに表示されるチャットを処理する（画像データが取れない可能性大｜調査中）
            </label>
          </div>

          <div class="field">
            <label class="checkbox">
              <input v-model="complementImage" type="checkbox" />
              &nbsp;取得できていないチャット画像を独自に生成する
            </label>
          </div>

          <div class="field">
            <label class="checkbox">
              <input v-model="generateOriginalImage" type="checkbox" />
              &nbsp;全てのチャット画像を独自に生成する
            </label>
          </div>

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

        <hr>

        <div class="field is-grouped">
          <p class="control">
            <label class="label field-into-height">スクリプトを実行する</label>
          </p>
          <p class="control">
            <label class="label field-into-height">
              <input v-model="runScript" type="checkbox" />
            </label>
          </p>
        </div>

        <div class="field is-grouped">
          <p class="control">
            <label class="label field-into-height">出力するログレベル</label>
          </p>
          <div class="control">
            <div class="select">
              <select v-model="showLogLevel">
                <option v-for="level of LOG_LEVELS" :key="level.name" :value="level.name">
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
            <p class="field-into-height">
              {{ byteInUse | formatByte }}
              <span v-if="loadDate">({{ loadDate | datetimeString }} 時点)</span>
            </p>
          </div>
        </div>

        <div class="field">
        </div>

        <div class="field is-grouped">
          <p class="control">
            <a class="button is-danger is-light" @click="handleDeleteVideos">
              動画とチャットを全て削除する
            </a>
          </p>
          <p class="control">
            <a class="button is-danger" @click="handleAllDelete">
              全てを初期化する
            </a>
          </p>
        </div>

        <div class="field is-grouped">
          <p class="control">
            <a class="button" @click="handleExportConfig">
              設定のエクスポート
            </a>
          </p>
          <div class="control">
            <div class="file">
              <label class="file-label">
                <input type="file" class="file-input" accept=".json" @change="handleInportConfig">
                <span class="file-cta">
                  <span class="file-label">設定のインポート (上書き)</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div class="field is-grouped">
          <p class="control">
            <a class="button" @click="handleExportData">
              データのバックアップ
            </a>
          </p>
          <div class="control">
            <div class="file">
              <label class="file-label">
                <input type="file" class="file-input" accept=".json" @change="handleInportData">
                <span class="file-cta">
                  <span class="file-label">データの復元</span>
                </span>
              </label>
            </div>
          </div>
        </div>

      </div>
      <!-- end right panel -->
    </div>

  </section>
</template>

<script lang="ts">
import { format as dateFormat } from 'date-fns'
import { Component, Vue } from 'vue-property-decorator'
import ChatFilterTable from './components/ChatFilterTable.vue'
import displayFilter from '../filters/displayFilter'

import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import Toast from '../plugins/Toast'
import Config, { ConfigInterface } from '../models/Config'
import Runtime from '../lib/chrome/Runtime'
import { ChatFilterConfigInterface } from '../lib/chatFilter/ChatFilterInterface'
import Logger, { LogLevel, LEVELS } from '../loggers/Logger'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import ChatStorage from '../lib/chrome/storage/ChatStorage'
import { classToPlain, deserialize, plainToClass, serialize } from 'class-transformer'
import Filer from '../lib/chrome/Filer'
import Storage from '../lib/chrome/storage/Storage'

@Component({
  components: { ChatFilterTable },
  filters: displayFilter,
})
export default class App extends Vue implements ConfigInterface {
  version?: string | null = null
  byteInUse: number = 0

  config?: Config | null = null
  loadDate?: Date | null = null

  // 表示用変数
  LOG_LEVELS = LEVELS // select 配列
  FORM_URL: string | null = null // フォームのURL

  // 初期値は適当 (絶対に上書きするので)
  chatFilters: ChatFilterConfigInterface[] = []
  mergeImageFileName: string = ''
  captureInitialChats: boolean = false
  chatDrawOnce: boolean = false
  complementImage: boolean = false
  generateOriginalImage: boolean = false

  maxVideoLength: number = 0
  ignoreSimpleVideo: boolean = false

  runScript: boolean = false
  showLogLevel: LogLevel = 'info'

  async mounted(): Promise<void> {
    this.FORM_URL = process.env.VUE_APP_FORM_URL || null

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
    this.loadDate = new Date()

    this.chatFilters = config.chatFilters
    this.mergeImageFileName = config.mergeImageFileName
    this.captureInitialChats = config.captureInitialChats
    this.chatDrawOnce = config.chatDrawOnce
    this.complementImage = config.complementImage
    this.generateOriginalImage = config.generateOriginalImage

    this.maxVideoLength = config.maxVideoLength
    this.ignoreSimpleVideo = config.ignoreSimpleVideo

    this.runScript = config.runScript
    this.showLogLevel = config.showLogLevel

    // 使用サイズを取得
    this.byteInUse = await Storage.getBytesInUseLocalStorage()

    // background でも設定を読み込む
    await Runtime.sendLoadConfig()
  }

  async handleSave(): Promise<void> {
    // 新しい config に値を追加していく (空白なら前の値)
    const config = new Config()
    config.chatFilters = this.chatFilters
    config.mergeImageFileName = this.mergeImageFileName || config.mergeImageFileName
    config.captureInitialChats = this.captureInitialChats
    config.chatDrawOnce = this.chatDrawOnce
    config.complementImage = this.complementImage
    config.generateOriginalImage = this.generateOriginalImage

    config.maxVideoLength = this.maxVideoLength
    config.ignoreSimpleVideo = this.ignoreSimpleVideo

    config.runScript = this.runScript
    config.showLogLevel = this.showLogLevel

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

  async handleReadme(): Promise<void> {
    await Runtime.openReadmePage()
  }

  async handleDeleteVideos(): Promise<void> {
    const result = window.confirm('全ての動画とチャットを削除します。')
    if (result) {
      // 動画を全て削除する
      const videos = await VideoStorage.getAll()
      for (const video of videos) {
        if (video.id) {
          await ChatStorage.clear(video.id)
        }
      }

      // 再読み込み
      await this.loadConfig()
    }
  }

  async handleAllDelete(): Promise<void> {
    const result = window.confirm('ストレージを空にします。')
    if (result) {
      const result2 = window.confirm('本当に削除しますか？')
      if (result2) {
        // config を消して再読み込み
        await Storage.clear()
        Toast.success('全てのデータを削除しました。')

        // 再読み込み
        await this.loadConfig()
      }
    }
  }

  ///

  async handleExportConfig(): Promise<void> {
    try {
      // json 化して出力する
      const title = dateFormat(new Date(), 'yyyyMMdd_HHmmss') + '_ycr_config.json'
      const text = await ConfigStorage.export(true)
      await Filer.downloadFile(text, title)

      Toast.success(`「${title}」を出力しました。`)
    } catch (err) {
      Toast.error('ファイルの出力に失敗しました。')
      Logger.error(err)
    }
  }

  async handleInportConfig(event: InputEvent): Promise<void> {
    const t = event.target as HTMLInputElement
    const file = t.files ? t.files[0] : null

    if (file) {
      try {
        const name = file.name
        const text = await Filer.readFile(file)
        if (!text) throw new Error('File not found')

        // config を読み込む
        await ConfigStorage.import(text)
        Toast.success(`「${name}」を読み込みました。`)

        // 再読み込み
        await this.loadConfig()
      } catch (err) {
        Toast.error('ファイルの読み込みに失敗しました。')
        Logger.error(err)
      }
    }
  }

  async handleExportData(): Promise<void> {
    try {
      // json 化して出力する
      const title = dateFormat(new Date(), 'yyyyMMdd_HHmmss') + '_ycr_data.json'
      const text = await Storage.export()
      await Filer.downloadFile(text, title)

      Toast.success(`「${title}」を出力しました。`)
    } catch (err) {
      Toast.error('ファイルの出力に失敗しました。')
      Logger.error(err)
    }
  }

  async handleInportData(event: InputEvent): Promise<void> {
    const t = event.target as HTMLInputElement
    const file = t.files ? t.files[0] : null

    if (file) {
      try {
        const name = file.name
        const text = await Filer.readFile(file)
        if (!text) throw new Error('File not found')

        // config を読み込む
        await Storage.import(text)
        Toast.success(`「${name}」を読み込みました。`)

        // 再読み込み
        await this.loadConfig()
      } catch (err) {
        Toast.error('ファイルの読み込みに失敗しました。')
        Logger.error(err)
      }
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

.full-height {
  height: 100%;
}
</style>
