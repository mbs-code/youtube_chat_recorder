<template>
  <div class="page">
    <header class="header">
      <img class="logo" src="/icons/icon-48x48.png" alt="" />
      <div class="heading">
        <h1 class="app-name">
          Youtube Chat Recorder
          <span class="badge">v{{ version }}</span>
        </h1>
        <p class="muted">設定</p>
      </div>
      <button class="btn btn-secondary" @click="Runtime.openReadmePage()">
        <i class="mdi mdi-help-circle-outline" />
        使い方
      </button>
      <a v-if="FORM_URL" class="btn btn-secondary" :href="FORM_URL" target="_blank" rel="noopener">
        <i class="mdi mdi-email-outline" />
        目安箱
      </a>
    </header>

    <p class="notice">
      <i class="mdi mdi-information-outline" />
      <span>
        設定を変えたら、開いている YouTube のページを
        <strong>更新 (F5)</strong>
        してください。更新するまで新しい設定は使われません。
      </span>
    </p>

    <main v-if="form" class="grid">
      <!-- 左: 記録するチャット -->
      <section class="card section">
        <header class="section-header">
          <h2>
            <i class="mdi mdi-message-text-outline" />
            記録するチャット
          </h2>
          <p class="muted">
            チャットの種類ごとに記録の仕方を選びます。
            <strong>保存する</strong>
            は文字だけ、
            <strong>画像化する</strong>
            はチャット欄の見た目のまま画像でも記録します (1 件 10KB ほど)。
          </p>
        </header>
        <ChatFilterTable v-model="form.chatFilters" />
      </section>

      <!-- 右 -->
      <div class="column">
        <section class="card section">
          <header class="section-header">
            <h2>
              <i class="mdi mdi-playlist-play" />
              動画の保存
            </h2>
          </header>
          <div class="field">
            <label class="label" for="maxVideoLength">動画の最大保存数</label>
            <div class="number">
              <input id="maxVideoLength" v-model.number="form.maxVideoLength" class="input" type="number" :min="MIN_VIDEO_LENGTH" />
              <span>本</span>
            </div>
            <p class="help">
              最近見た動画をこの本数まで残します。超えると古い動画からチャットごと削除されます。({{ MIN_VIDEO_LENGTH }} 以上)
            </p>
          </div>
          <ToggleSwitch v-model="form.ignoreSimpleVideo">
            チャットが無い動画を無視する
            <template #description>ライブ配信ではない普通の動画を、最近見た動画に残しません。</template>
          </ToggleSwitch>
        </section>

        <section class="card section">
          <header class="section-header">
            <h2>
              <i class="mdi mdi-image-multiple-outline" />
              チャットの保存
            </h2>
          </header>
          <div class="toggles">
            <ToggleSwitch v-model="form.chatDrawOnce">
              一度取得した画像は再取得しない
              <template #description>同じチャットが再び表示されても画像を撮り直しません。動作が軽くなります。</template>
            </ToggleSwitch>
            <ToggleSwitch v-model="form.captureInitialChats">
              初めに表示されるチャットを処理する
              <template #description>ページを開いた時点で表示されていたチャットも記録します。画像の記録には失敗しやすいです。</template>
            </ToggleSwitch>
            <ToggleSwitch v-model="form.complementImage">
              取得できていないチャット画像を独自に生成する
              <template #description>画像をつなげて保存するとき、画像が無いチャットを独自のデザインで画像にします。</template>
            </ToggleSwitch>
            <ToggleSwitch v-model="form.generateOriginalImage">
              全てのチャット画像を独自に生成する
              <template #description>画像をつなげて保存するとき、全てのチャットを独自のデザインで画像にします。</template>
            </ToggleSwitch>
          </div>

          <div class="field">
            <label class="label" for="mergeImageFileName">つなげた画像のファイル名</label>
            <div class="filename">
              <input
                id="mergeImageFileName"
                v-model="form.mergeImageFileName"
                class="input"
                type="text"
                :placeholder="DEFAULTS.mergeImageFileName"
              />
              <span class="ext">.png</span>
            </div>
            <p class="help">
              <code>%title%</code>
              タイトル ・
              <code>%id%</code>
              動画ID ・
              <code>%count%</code>
              チャット数 ・
              <code>%now%</code>
              保存日時 ・
              <code>%upload%</code>
              公開日時
              <br />
              日時の形式は
              <code>%now(yyyy年MM月dd日)%</code>
              のように指定できます (
              <a href="https://date-fns.org/docs/format" target="_blank" rel="noopener">書き方</a>
              )。使えない文字は自動で置き換えます。
            </p>
          </div>
        </section>

        <section class="card section">
          <header class="section-header">
            <h2>
              <i class="mdi mdi-tune-variant" />
              詳細設定
            </h2>
          </header>
          <ToggleSwitch v-model="form.runScript">
            スクリプトを実行する
            <template #description>オフにすると、この拡張機能はチャットを記録しなくなります。</template>
          </ToggleSwitch>
          <div class="inline-field">
            <div>
              <label class="label" for="showLogLevel">出力するログレベル</label>
              <p class="help">不具合を調べるときの記録の詳しさです。ふだんは変えなくて大丈夫です。</p>
            </div>
            <select id="showLogLevel" v-model="form.showLogLevel" class="select log-level">
              <option v-for="level of LEVELS" :key="level.name" :value="level.name">
                {{ level.name.toUpperCase() }}
              </option>
            </select>
          </div>
        </section>

        <section class="card section">
          <header class="section-header">
            <h2>
              <i class="mdi mdi-database-outline" />
              データの管理
            </h2>
            <p class="muted">
              使用量:
              <strong>{{ formatByte(byteInUse) }}</strong>
              <span v-if="loadDate">({{ datetimeString(loadDate) }} 時点)</span>
            </p>
          </header>

          <div class="data-rows">
            <div class="data-row">
              <span>設定</span>
              <button class="btn btn-secondary is-small" @click="handleExportConfig">
                <i class="mdi mdi-download" />
                エクスポート
              </button>
              <label class="btn btn-secondary is-small">
                <i class="mdi mdi-upload" />
                インポート
                <input type="file" class="sr-only" accept=".json" @change="handleImportConfig" />
              </label>
            </div>
            <div class="data-row">
              <span>全てのデータ</span>
              <button class="btn btn-secondary is-small" @click="handleExportData">
                <i class="mdi mdi-download" />
                バックアップ
              </button>
              <label class="btn btn-secondary is-small">
                <i class="mdi mdi-upload" />
                復元
                <input type="file" class="sr-only" accept=".json" @change="handleImportData" />
              </label>
            </div>
          </div>

          <div class="danger-zone">
            <p class="danger-title">
              <i class="mdi mdi-alert-outline" />
              元に戻せない操作
            </p>
            <div class="danger-actions">
              <button class="btn btn-danger is-small" @click="handleDeleteVideos">動画とチャットを全て削除</button>
              <button class="btn btn-danger-solid is-small" @click="handleAllDelete">全てを初期化</button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <footer class="savebar" :class="{ 'is-dirty': isDirty }">
      <span class="status">
        <template v-if="isDirty">
          <i class="mdi mdi-circle-medium" />
          保存されていない変更があります
        </template>
        <span v-else class="muted">変更はありません</span>
      </span>
      <button class="btn btn-ghost" @click="handleReset">初期設定に戻す</button>
      <button class="btn btn-secondary" :disabled="!isDirty" @click="loadConfig">変更を取り消す</button>
      <button class="btn btn-primary" :disabled="!isDirty" @click="handleSave">
        <i class="mdi mdi-check" />
        保存する
      </button>
    </footer>

    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
import { format as dateFormat } from 'date-fns'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import ToastContainer from '../components/ToastContainer.vue'
import ToggleSwitch from '../components/ToggleSwitch.vue'
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
/** 読み込んだ時点の設定値 (変更の有無の判定用). */
const saved = ref('')

const isDirty = computed(() => form.value !== null && JSON.stringify(form.value) !== saved.value)

// 保存せずに閉じようとしたら確認する
function onBeforeUnload(event: BeforeUnloadEvent): void {
  if (isDirty.value) event.preventDefault()
}
onMounted(async () => {
  window.addEventListener('beforeunload', onBeforeUnload)
  await loadConfig()
})
onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

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
  saved.value = JSON.stringify(form.value)
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
    Toast.warn(`動画の最大保存数は ${MIN_VIDEO_LENGTH} 以上にしてください。${MIN_VIDEO_LENGTH} で保存しました。`)
  } else {
    config.maxVideoLength = Math.floor(maxVideoLength)
  }

  await ConfigStorage.save(config)
  Toast.success('設定を保存しました。開いている YouTube のページを更新してください。')
  await loadConfig()
}

async function handleReset(): Promise<void> {
  if (window.confirm('設定を初期設定に戻します。(記録したチャットは消えません)')) {
    await ConfigStorage.clear()
    Toast.success('設定を初期設定に戻しました。')
    await loadConfig()
  }
}

async function handleDeleteVideos(): Promise<void> {
  if (window.confirm('記録した全ての動画とチャットを削除します。\nこの操作は元に戻せません。')) {
    for (const video of await VideoStorage.getAll()) {
      if (video.id) await ChatStorage.clear(video.id)
    }
    await VideoStorage.clear()
    Toast.success('全ての動画とチャットを削除しました。')
    await loadConfig()
  }
}

async function handleAllDelete(): Promise<void> {
  if (window.confirm('設定も含めて、全てのデータを削除します。') && window.confirm('本当に削除しますか？この操作は元に戻せません。')) {
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
    Toast.success(`「${title}」を保存しました。`)
  } catch (err) {
    Toast.error('ファイルの保存に失敗しました。')
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
const handleImportData = (event: Event) => {
  if (window.confirm('今のデータを、選んだファイルの内容で上書きします。')) {
    void importJson(event, text => Storage.import(text))
  } else {
    ;(event.target as HTMLInputElement).value = ''
  }
}
</script>

<style scoped>
.page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32px 24px 0;
}

.header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 20px;
}

.logo {
  width: 40px;
  height: 40px;
  margin-right: 6px;
}

.heading {
  flex: 1;
}

.app-name {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-strong);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.3;
}

.notice {
  margin-bottom: 20px;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: 20px;

  @media (min-width: 1000px) {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
  }
}

.column {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section {
  padding: 20px;
}

.section-header {
  margin-bottom: 16px;

  & h2 {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
    color: var(--text-strong);
    font-size: 15px;
    font-weight: 700;

    & .mdi {
      color: var(--text-muted);
    }
  }

  & p {
    font-size: 13px;
  }
}

.field + .toggle,
.toggles + .field {
  margin-top: 12px;
}

.toggles {
  display: flex;
  flex-direction: column;

  & > * + * {
    border-top: 1px solid var(--border);
  }
}

.number {
  display: flex;
  align-items: center;
  gap: 8px;

  & .input {
    width: 100px;
  }
}

.filename {
  display: flex;

  & .input {
    border-top-right-radius: 0;
    border-bottom-right-radius: 0;
  }

  & .ext {
    display: grid;
    place-items: center;
    padding: 0 10px;
    border: 1px solid var(--border-strong);
    border-left: none;
    border-radius: 0 8px 8px 0;
    background: var(--surface-muted);
    color: var(--text-muted);
    font-size: 13px;
  }
}

.help code {
  font-size: 11px;
}

.inline-field {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--border);

  & .label {
    margin: 0;
    font-weight: 500;
  }

  & .help {
    margin-top: 2px;
  }
}

.log-level {
  width: 110px;
  flex-shrink: 0;
}

.data-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.data-row {
  display: flex;
  align-items: center;
  gap: 8px;

  & > span {
    flex: 1;
    font-weight: 500;
  }
}

.danger-zone {
  margin-top: 16px;
  padding: 12px;
  border: 1px solid var(--danger-border);
  border-radius: 10px;
  background: var(--danger-soft);
}

.danger-title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
  color: var(--danger);
  font-size: 13px;
  font-weight: 600;
}

.danger-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.savebar {
  position: sticky;
  bottom: 0;
  z-index: 40;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 24px -24px 0;
  padding: 12px 24px;
  border-top: 1px solid var(--border);
  background: color-mix(in oklab, var(--surface) 92%, transparent);
  backdrop-filter: blur(8px);
}

.status {
  display: flex;
  flex: 1;
  align-items: center;
  font-size: 13px;

  .is-dirty & {
    color: var(--warning);
    font-weight: 600;

    & .mdi {
      font-size: 22px;
    }
  }
}
</style>
