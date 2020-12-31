<template>
  <section v-if="config" class="section">

    <div class="field">
      <label class="label">コメントの処理設定</label>
      <div class="control">
        <div class="box">
          <table class="table">
            <thead>
              <tr>
                <th class="has-text-centered">項目</th>
                <th class="has-text-centered">保存する</th>
                <th class="has-text-centered">画像化する</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="chatFilter in chatFilters" :key="chatFilter.key">
                <th>{{ chatFilter.title }}</th>
                <td class="has-text-centered">
                  <input v-model="chatFilter.doSave" type="checkbox" @change="handleDoSave(chatFilter)" />
                </td>
                <td class="has-text-centered">
                  <input v-model="chatFilter.doImage" type="checkbox" @change="handleDoImage(chatFilter)" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
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
        <a class="button is-primary" @click="handleSave">
          保存する
        </a>
      </p>
      <p class="control">
        <a class="button is-light" @click="handleReset">
          リセット
        </a>
      </p>
    </div>

  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import ConfigStorage from '../lib/chrome/Configstorage'
import Toast from '../plugins/Toast'
import Config from '../models/Config'
import { ChatConfigFilterInterface } from '../configs/ChatFilters'

@Component
export default class App extends Vue {
  config?: Config | null = null

  // 初期値は適当 (絶対に上書きするので)
  chatFilters: ChatConfigFilterInterface[] = []
  mergeImageFileName: string = ''
  maxVideoLength: number = 0

  async mounted(): Promise<void> {
    // 設定の読み込み
    await this.loadConfig()
  }

  async loadConfig(): Promise<void> {
    const config = await ConfigStorage.get()
    this.config = config

    this.chatFilters = config.chatFilters
    this.mergeImageFileName = config.mergeImageFileName
    this.maxVideoLength = config.maxVideoLength
  }

  async handleSave(): Promise<void> {
    // 新しい config に値を追加していく (空白なら前の値)
    const config = new Config()
    config.chatFilters = this.chatFilters
    config.mergeImageFileName = this.mergeImageFileName || config.mergeImageFileName
    config.maxVideoLength = this.maxVideoLength || config.maxVideoLength

    // リミット確認
    if (config.maxVideoLength < 5) {
      config.maxVideoLength = 5
      Toast.error('動画の最大保存数は 5 以上です。')
    }

    // 保存する
    await ConfigStorage.save(config)
    Toast.success('保存しました。')

    // 再読み込み
    await this.loadConfig()
  }

  async handleReset(): Promise<void> {
    const result = window.confirm('設定を初期化します。')
    if (result) {
      // config を消して再読み込み
      await ConfigStorage.clear()
      Toast.success('リセットしました。')

      await this.loadConfig()
    }
  }

  ///

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
</style>
