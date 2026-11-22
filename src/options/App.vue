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
        <a class="button is-link is-outlined full-height" :href="FORM_URL" target="_blank" rel="noopener">
          <span class="icon">
            <i class="mdi mdi-inbox-arrow-down" />
          </span>
          <span>目安箱</span>
        </a>
      </div>
    </div>

    <div class="field">
      <div class="notification is-warning is-light">
        開いているYouTubeのページに適用させる場合は、その
        <strong>ページを更新</strong>
        してください。
      </div>
    </div>

    <div class="field is-grouped">
      <p class="control">
        <button class="button is-primary" @click="handleSave">保存する</button>
      </p>
      <p class="control">
        <button class="button" @click="handleReset">リセット</button>
      </p>
      <p class="control">
        <button class="button is-success is-outlined" @click="Runtime.openReadmePage()">使い方</button>
      </p>
    </div>

    <hr />

    <div v-if="form" class="columns is-desktop">
      <!-- start left panel -->
      <div class="column">
        <div class="field">
          <label class="label">チャットの処理設定</label>
          <div class="control">
            <div class="box">
              <ChatFilterTable v-model="form.chatFilters" />
            </div>
          </div>
        </div>

        <div class="field">
          <div class="notification">
            ※
            <strong>「保存する」「画像化する」を選択する</strong>
            と処理されます。
            <br />
            ※ 「画像化する」は負荷が高い＆容量を食うので加減して使用してください。( 1枚10KBくらい )
            <br />
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
              <input v-model="form.ignoreSimpleVideo" type="checkbox" />
              &nbsp;チャットが無い動画を無視する
            </label>
          </div>

          <div class="field">
            <label class="label">動画の最大保存数(最低 {{ MIN_VIDEO_LENGTH }})</label>
            <div class="control">
              <input v-model.number="form.maxVideoLength" class="input" type="number" name="maxVideoLength" :min="MIN_VIDEO_LENGTH" />
            </div>
          </div>
        </div>

        <div class="field">
          <div class="notification">
            ※ 最大値を超えた場合、参照していない動画とチャットが削除されます。
            <br />
            &emsp;適度に大きい値にするか、予め画像の保存などを行ってください。
          </div>
        </div>

        <div class="field">
          <label class="label">チャットの保存設定</label>
        </div>

        <div class="box">
          <div class="field">
            <label class="checkbox">
              <input v-model="form.chatDrawOnce" type="checkbox" />
              &nbsp;一度取得した画像は再取得しない
            </label>
          </div>

          <div class="field">
            <label class="checkbox">
              <input v-model="form.captureInitialChats" type="checkbox" />
              &nbsp;初めに表示されるチャットを処理する（画像データが取れない可能性大｜調査中）
            </label>
          </div>

          <div class="field">
            <label class="checkbox">
              <input v-model="form.complementImage" type="checkbox" />
              &nbsp;取得できていないチャット画像を独自に生成する
            </label>
          </div>

          <div class="field">
            <label class="checkbox">
              <input v-model="form.generateOriginalImage" type="checkbox" />
              &nbsp;全てのチャット画像を独自に生成する
            </label>
          </div>

          <div class="field">
            <label class="label">結合後の画像ファイル名</label>
            <div class="control">
              <div class="field has-addons">
                <p class="control is-expanded">
                  <input
                    v-model="form.mergeImageFileName"
                    class="input"
                    type="text"
                    name="mergeImageFileName"
                    :placeholder="DEFAULTS.mergeImageFileName"
                  />
                </p>
                <p class="control">
                  <span class="button is-static">.png</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="field">
          <div class="notification">
            <code>%title%</code>
            : 動画のタイトル,
            <code>%id%</code>
            : 動画のID,
            <code>%count%</code>
            : 結合するチャットの数,
            <code>%now%</code>
            : 現在時刻,
            <code>%upload%</code>
            : 動画の投稿時刻
            <br />
            ※ 時刻系のフォーマットは
            <code>%now(yyyy-MM-dd_HH_mm_ss)%</code>
            のように括弧を使用して指定可能。
            <br />
            ※ 詳しくはリンク先を参照:
            <a href="https://date-fns.org/docs/format" target="_blank" rel="noopener">
              <span class="icon is-small"><i class="mdi mdi-link-variant" /></span>
              date-fns/format
            </a>
            <br />
            ※ 禁則文字は勝手にエスケープします。
          </div>
        </div>

        <hr />

        <div class="field is-grouped">
          <p class="control">
            <label class="label field-into-height" for="runScript">スクリプトを実行する</label>
          </p>
          <p class="control">
            <label class="label field-into-height">
              <input id="runScript" v-model="form.runScript" type="checkbox" />
            </label>
          </p>
        </div>

        <div class="field is-grouped">
          <p class="control">
            <label class="label field-into-height">出力するログレベル</label>
          </p>
          <div class="control">
            <div class="select">
              <select v-model="form.showLogLevel">
                <option v-for="level of LEVELS" :key="level.name" :value="level.name">
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
              {{ formatByte(byteInUse) }}
              <span v-if="loadDate">({{ datetimeString(loadDate) }} 時点)</span>
            </p>
          </div>
        </div>

        <div class="field is-grouped">
          <p class="control">
            <button class="button is-danger is-light" @click="handleDeleteVideos">動画とチャットを全て削除する</button>
          </p>
          <p class="control">
            <button class="button is-danger" @click="handleAllDelete">全てを初期化する</button>
          </p>
        </div>

        <div class="field is-grouped">
          <p class="control">
            <button class="button" @click="handleExportConfig">設定のエクスポート</button>
          </p>
          <div class="control">
            <div class="file">
              <label class="file-label">
                <input type="file" class="file-input" accept=".json" @change="handleImportConfig" />
                <span class="file-cta">
                  <span class="file-label">設定のインポート (上書き)</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div class="field is-grouped">
          <p class="control">
            <button class="button" @click="handleExportData">データのバックアップ</button>
          </p>
          <div class="control">
            <div class="file">
              <label class="file-label">
                <input type="file" class="file-input" accept=".json" @change="handleImportData" />
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

<script setup lang="ts">
import { format as dateFormat } from 'date-fns'
import { onMounted, ref } from 'vue'
import Filer from '../lib/chrome/Filer'
import Runtime from '../lib/chrome/Runtime'
import ChatStorage from '../lib/chrome/storage/ChatStorage'
import ConfigStorage from '../lib/chrome/storage/ConfigStorage'
import Storage from '../lib/chrome/storage/Storage'
import VideoStorage from '../lib/chrome/storage/VideoStorage'
import { datetimeString, formatByte } from '../lib/util/format'
import Logger, { LEVELS } from '../loggers/Logger'
import Config, { type ConfigInterface, MIN_VIDEO_LENGTH } from '../models/Config'
import Toast from '../plugins/Toast'
import ChatFilterTable from './components/ChatFilterTable.vue'

const FORM_URL = import.meta.env.VITE_FORM_URL || import.meta.env.VUE_APP_FORM_URL || null
const DEFAULTS = new Config()

const version = Runtime.getManifest().version
const byteInUse = ref(0)
const loadDate = ref<Date | null>(null)

/** 編集中の設定値. */
const form = ref<ConfigInterface | null>(null)

onMounted(async () => {
  await loadConfig()
})

async function loadConfig(): Promise<void> {
  const config = await ConfigStorage.get()
  form.value = {
    chatFilters: config.chatFilters.map(cf => ({ ...cf })),
    mergeImageFileName: config.mergeImageFileName,
    captureInitialChats: config.captureInitialChats,
    chatDrawOnce: config.chatDrawOnce,
    complementImage: config.complementImage,
    generateOriginalImage: config.generateOriginalImage,
    maxVideoLength: config.maxVideoLength,
    ignoreSimpleVideo: config.ignoreSimpleVideo,
    runScript: config.runScript,
    showLogLevel: config.showLogLevel,
  }
  loadDate.value = new Date()
  byteInUse.value = await Storage.getBytesInUseLocalStorage()

  // background でも設定を読み込む
  await Runtime.sendLoadConfig()
}

async function handleSave(): Promise<void> {
  if (!form.value) return

  const config = Object.assign(new Config(), form.value)
  config.mergeImageFileName = form.value.mergeImageFileName || DEFAULTS.mergeImageFileName // 空白なら初期値

  const maxVideoLength = Number(config.maxVideoLength)
  if (!Number.isFinite(maxVideoLength) || maxVideoLength < MIN_VIDEO_LENGTH) {
    config.maxVideoLength = MIN_VIDEO_LENGTH
    Toast.error(`動画の最大保存数は ${MIN_VIDEO_LENGTH} 以上です。`)
  } else {
    config.maxVideoLength = Math.floor(maxVideoLength)
  }

  await ConfigStorage.save(config)
  Toast.success('設定を保存しました。')
  await loadConfig()
}

async function handleReset(): Promise<void> {
  if (window.confirm('設定を初期化します。')) {
    await ConfigStorage.clear()
    Toast.success('設定をリセットしました。')
    await loadConfig()
  }
}

async function handleDeleteVideos(): Promise<void> {
  if (window.confirm('全ての動画とチャットを削除します。')) {
    for (const video of await VideoStorage.getAll()) {
      if (video.id) await ChatStorage.clear(video.id)
    }
    await VideoStorage.clear()
    Toast.success('全ての動画とチャットを削除しました。')
    await loadConfig()
  }
}

async function handleAllDelete(): Promise<void> {
  if (window.confirm('ストレージを空にします。') && window.confirm('本当に削除しますか？')) {
    await Storage.clear()
    Toast.success('全てのデータを削除しました。')
    await loadConfig()
  }
}

///

async function exportJson(name: string, createUrl: () => Promise<string>): Promise<void> {
  try {
    const title = `${dateFormat(new Date(), 'yyyyMMdd_HHmmss')}_${name}.json`
    const url = await createUrl()
    Filer.downloadFile(url, title)
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    Toast.success(`「${title}」を出力しました。`)
  } catch (err) {
    Toast.error('ファイルの出力に失敗しました。')
    Logger.error(err)
  }
}

async function importJson(event: Event, apply: (text: string) => Promise<void>): Promise<void> {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  try {
    await apply(await Filer.readFile(file))
    Toast.success(`「${file.name}」を読み込みました。`)
    await loadConfig()
  } catch (err) {
    Toast.error('ファイルの読み込みに失敗しました。')
    Logger.error(err)
  } finally {
    input.value = '' // 同じファイルを再度選択できるようにする
  }
}

const handleExportConfig = () => exportJson('ycr_config', () => ConfigStorage.export(true))
const handleImportConfig = (event: Event) => importJson(event, text => ConfigStorage.import(text))
const handleExportData = () => exportJson('ycr_data', () => Storage.export())
const handleImportData = (event: Event) => importJson(event, text => Storage.import(text))
</script>

<style scoped>
/* checkbox を x1.5 に */
input[type='checkbox'] {
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
