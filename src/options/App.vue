<template>
  <div class="mx-auto max-w-300 px-6 pt-8">
    <!-- ヘッダー: アプリ名・バージョンと「使い方」「目安箱」 -->
    <header class="mb-5 flex items-center gap-2">
      <img class="mr-1.5 size-10" src="/icons/icon-48x48.png" alt="">
      <div class="flex-1">
        <h1 class="flex items-center gap-2 text-xl/tight font-bold text-zinc-950">
          Youtube Chat Recorder
          <span class="badge">v{{ version }}</span>
        </h1>
        <p class="text-zinc-500">設定</p>
      </div>
      <button class="btn btn-secondary" @click="Runtime.openReadmePage()">
        <i class="mdi mdi-help-circle-outline" />
        使い方
      </button>
      <a
        v-if="FORM_URL"
        class="btn btn-secondary"
        :href="FORM_URL"
        target="_blank"
        rel="noopener"
      >
        <i class="mdi mdi-email-outline" />
        目安箱
      </a>
    </header>

    <!-- 設定を変えたらページの更新が必要という案内 -->
    <p class="notice mb-5">
      <i class="mdi mdi-information-outline" />
      <span>
        設定を変えたら、開いている YouTube のページを
        <strong>更新 (F5)</strong>
        してください。更新するまで新しい設定は使われません。
      </span>
    </p>

    <main v-if="form" class="grid grid-cols-1 items-start gap-5 min-[1000px]:grid-cols-[7fr_5fr]">
      <!-- 左: 記録するチャット (チャットフィルターの表・テキストマッチングの追加・テスト) -->
      <section class="card p-5">
        <header class="mb-4">
          <h2 class="mb-1 flex items-center gap-2 text-[15px] font-bold text-zinc-950">
            <i class="mdi mdi-message-text-outline text-zinc-500" />
            記録するチャット
          </h2>
          <p class="text-[13px] text-zinc-500">
            チャットの種類ごとに記録の仕方を選びます。
            <strong>保存する</strong>
            は文字だけ、
            <strong>画像化する</strong>
            はチャット欄の見た目のまま画像でも記録します (1 件 10KB ほど)。
          </p>
        </header>
        <ChatFilterTable v-model="form.chatFilters" />
      </section>

      <!-- 右: 動画の保存 / チャットの保存 / 詳細設定 / データの管理 -->
      <div class="flex flex-col gap-5">
        <!-- 動画の保存: 最大保存数・普通の動画を無視するか -->
        <section class="card p-5">
          <h2 class="mb-4 flex items-center gap-2 text-[15px] font-bold text-zinc-950">
            <i class="mdi mdi-playlist-play text-zinc-500" />
            動画の保存
          </h2>
          <div class="mb-3">
            <label class="label" for="maxVideoLength">動画の最大保存数</label>
            <div class="flex items-center gap-2">
              <input
                id="maxVideoLength"
                v-model.number="form.maxVideoLength"
                class="input w-25"
                type="number"
                :min="MIN_VIDEO_LENGTH"
              >
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
          <ToggleSwitch v-model="form.recordStats">
            同接・再生数などを記録してグラフにする
            <template #description>配信中は 1 分ごとに同時接続数・コメント数・再生数を記録し、最大同接も記録します。再生数は動画を開くたびにも記録します。</template>
          </ToggleSwitch>
        </section>

        <!-- チャットの保存: 画像化の設定とつなげた画像のファイル名 -->
        <section class="card p-5">
          <h2 class="mb-4 flex items-center gap-2 text-[15px] font-bold text-zinc-950">
            <i class="mdi mdi-image-multiple-outline text-zinc-500" />
            チャットの保存
          </h2>
          <div class="flex flex-col divide-y divide-zinc-200">
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

          <div class="mt-3">
            <label class="label" for="mergeImageFileName">つなげた画像のファイル名</label>
            <div class="flex">
              <input
                id="mergeImageFileName"
                v-model="form.mergeImageFileName"
                class="input rounded-r-none"
                type="text"
                :placeholder="DEFAULTS.mergeImageFileName"
              >
              <span
                class="grid place-items-center rounded-r-lg border border-l-0 border-zinc-300 bg-zinc-50 px-2.5 text-[13px] text-zinc-500"
              >
                .png
              </span>
            </div>
            <p class="help [&_code]:text-[11px]">
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
              <br>
              日時の形式は
              <code>%now(yyyy年MM月dd日)%</code>
              のように指定できます (
              <a class="underline" href="https://date-fns.org/docs/format" target="_blank" rel="noopener">書き方</a>
              )。使えない文字は自動で置き換えます。
            </p>
          </div>
        </section>

        <!-- 詳細設定: スクリプトの実行とログレベル -->
        <section class="card p-5">
          <h2 class="mb-4 flex items-center gap-2 text-[15px] font-bold text-zinc-950">
            <i class="mdi mdi-tune-variant text-zinc-500" />
            詳細設定
          </h2>
          <ToggleSwitch v-model="form.runScript">
            スクリプトを実行する
            <template #description>オフにすると、この拡張機能はチャットを記録しなくなります。</template>
          </ToggleSwitch>
          <div class="flex items-start gap-4 border-t border-zinc-200 pt-3">
            <div>
              <label class="label m-0 font-medium" for="showLogLevel">出力するログレベル</label>
              <p class="help mt-0.5">不具合を調べるときの記録の詳しさです。ふだんは変えなくて大丈夫です。</p>
            </div>
            <select id="showLogLevel" v-model="form.showLogLevel" class="select w-27.5 shrink-0">
              <option v-for="level of LEVELS" :key="level.name" :value="level.name">
                {{ level.name.toUpperCase() }}
              </option>
            </select>
          </div>
        </section>

        <!-- データの管理: 使用量・エクスポート / インポート・全チャットの CSV・削除 -->
        <section class="card p-5">
          <header class="mb-4">
            <h2 class="mb-1 flex items-center gap-2 text-[15px] font-bold text-zinc-950">
              <i class="mdi mdi-database-outline text-zinc-500" />
              データの管理
            </h2>
            <p class="text-[13px] text-zinc-500">
              使用量:
              <strong>{{ formatByte(byteInUse) }}</strong>
              <span v-if="loadDate">({{ datetimeString(loadDate) }} 時点)</span>
            </p>
          </header>

          <div class="flex flex-col gap-2">
            <div class="flex items-center gap-2">
              <span class="flex-1 font-medium">設定</span>
              <button class="btn btn-secondary btn-sm" @click="handleExportConfig">
                <i class="mdi mdi-download" />
                エクスポート
              </button>
              <label class="btn btn-secondary btn-sm">
                <i class="mdi mdi-upload" />
                インポート
                <input type="file" class="sr-only" accept=".json" @change="handleImportConfig">
              </label>
            </div>
            <div class="flex items-center gap-2">
              <span class="flex-1 font-medium">
                全てのチャット
                <span class="block text-xs font-normal text-zinc-500">保存している全ての動画のチャットを 1 つの CSV にまとめます</span>
              </span>
              <button class="btn btn-secondary btn-sm" :disabled="isExportingCsv" @click="handleExportAllCsv">
                <i class="mdi" :class="isExportingCsv ? 'mdi-loading mdi-spin' : 'mdi-file-delimited-outline'" />
                CSV で出力
              </button>
            </div>
            <div class="flex items-center gap-2">
              <span class="flex-1 font-medium">全てのデータ</span>
              <button class="btn btn-secondary btn-sm" @click="handleExportData">
                <i class="mdi mdi-download" />
                バックアップ
              </button>
              <label class="btn btn-secondary btn-sm">
                <i class="mdi mdi-upload" />
                復元
                <input type="file" class="sr-only" accept=".json" @change="handleImportData">
              </label>
            </div>
          </div>

          <div class="mt-4 rounded-[10px] border border-danger-border bg-danger-soft p-3">
            <p class="mb-2 flex items-center gap-1.5 text-[13px] font-semibold text-danger">
              <i class="mdi mdi-alert-outline" />
              元に戻せない操作
            </p>
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-danger btn-sm" @click="handleDeleteVideos">動画とチャットを全て削除</button>
              <button class="btn btn-danger-solid btn-sm" @click="handleAllDelete">全てを初期化</button>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- 保存バー: 未保存の変更があるか表示し、保存・取り消し・初期化する (常に下に残る) -->
    <footer class="sticky bottom-0 z-40 -mx-6 mt-6 flex items-center gap-2 border-t border-zinc-200 bg-white/90 px-6 py-3 backdrop-blur-sm">
      <span class="flex flex-1 items-center text-[13px]" :class="isDirty ? 'font-semibold text-warning' : 'text-zinc-500'">
        <template v-if="isDirty">
          <i class="mdi mdi-circle-medium text-[22px]" />
          保存されていない変更があります
        </template>
        <template v-else>変更はありません</template>
      </span>
      <button class="btn btn-ghost" @click="handleReset">初期設定に戻す</button>
      <button class="btn btn-secondary" :disabled="!isDirty" @click="loadConfig">変更を取り消す</button>
      <button class="btn btn-primary" :disabled="!isDirty" @click="handleSave">
        <i class="mdi mdi-check" />
        保存する
      </button>
    </footer>

    <!-- 通知 (画面右上) -->
    <ToastContainer />
  </div>
</template>

<script setup lang="ts">
/**
 * 設定画面 (オプションページ).
 *
 * - 設定は form で編集し、「保存する」で @config に保存する (それまでは反映しない).
 * - 保存した設定は、開いている YouTube のページを更新すると使われる.
 * - データの管理 (エクスポート / インポート / CSV / 削除) もここで行う.
 */
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
import ChatCsv, { type VideoChats } from '../lib/util/ChatCsv'
import { datetimeString, formatByte } from '../lib/util/format'
import Logger, { LEVELS } from '../loggers/Logger'
import Config, { type ConfigInterface, MIN_VIDEO_LENGTH } from '../models/Config'
import Toast from '../plugins/Toast'
import ChatFilterTable from './components/ChatFilterTable.vue'

/** 目安箱のリンク先 (.env の VITE_FORM_URL). 無ければボタンを出さない. */
const FORM_URL = import.meta.env.VITE_FORM_URL || import.meta.env.VUE_APP_FORM_URL || null
/** 初期設定 (入力欄の placeholder などに使う). */
const DEFAULTS = new Config()

/** 拡張機能のバージョン. */
const version = Runtime.getManifest().version
/** storage の使用量 (byte) と、それを読み込んだ日時. */
const byteInUse = ref(0)
const loadDate = ref<Date | null>(null)

/** 編集中の設定値. */
const form = ref<ConfigInterface | null>(null)
/** 読み込んだ時点の設定値 (変更の有無の判定用). */
const saved = ref('')

/** 保存していない変更があるか. */
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

/** 保存されている設定を読み込んで form に入れる (編集中の内容は捨てる). */
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
    recordStats: config.recordStats,
    runScript: config.runScript,
    showLogLevel: config.showLogLevel,
  }
  saved.value = JSON.stringify(form.value)
  loadDate.value = new Date()
  byteInUse.value = await Storage.getBytesInUseLocalStorage()

  // background でも設定を読み込む
  await Runtime.sendLoadConfig()
}

/** form の内容を保存する (動画の最大保存数は下限を確認する). */
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

/** 設定を初期設定に戻す (動画やチャットは消さない). */
async function handleReset(): Promise<void> {
  if (window.confirm('設定を初期設定に戻します。(記録したチャットは消えません)')) {
    await ConfigStorage.clear()
    Toast.success('設定を初期設定に戻しました。')
    await loadConfig()
  }
}

/** 記録した全ての動画とチャットを削除する (設定は残す). */
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

/** 設定も含めて全てのデータを削除する. */
async function handleAllDelete(): Promise<void> {
  if (window.confirm('設定も含めて、全てのデータを削除します。') && window.confirm('本当に削除しますか？この操作は元に戻せません。')) {
    await Storage.clear()
    Toast.success('全てのデータを削除しました。')
    await loadConfig()
  }
}

///

/** JSON ファイルとしてダウンロードさせる (ファイル名は 日時_name.json). */
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

/** 選ばれた JSON ファイルを読み込んで apply に渡す. */
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

/** 全チャットの CSV を作っている最中か. */
const isExportingCsv = ref(false)

/** 保存している全ての動画のチャットを 1 つの CSV にして保存する (動画は最近見た順). */
async function handleExportAllCsv(): Promise<void> {
  isExportingCsv.value = true
  try {
    const groups: VideoChats[] = []
    for (const video of await VideoStorage.getAll()) {
      const chats = video.id ? await ChatStorage.get(video.id) : []
      if (chats.length > 0) groups.push({ video, chats })
    }

    const total = groups.reduce((sum, g) => sum + g.chats.length, 0)
    if (total === 0) {
      Toast.warn('保存しているチャットがありません。')
      return
    }

    const title = `${dateFormat(new Date(), 'yyyyMMdd_HHmmss')}_ycr_chats.csv`
    const url = ChatCsv.createManyObjectURL(groups)
    Filer.downloadFile(url, title)
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    Toast.success(`${groups.length} 本の動画のチャット ${total.toLocaleString()} 件を「${title}」に保存しました。`)
  } catch (err) {
    Toast.error('CSV の保存に失敗しました。')
    Logger.error(err)
  } finally {
    isExportingCsv.value = false
  }
}
/** 全てのデータを復元する (上書きなので確認する). */
const handleImportData = (event: Event) => {
  if (window.confirm('今のデータを、選んだファイルの内容で上書きします。')) {
    void importJson(event, text => Storage.import(text))
  } else {
    ;(event.target as HTMLInputElement).value = ''
  }
}
</script>
