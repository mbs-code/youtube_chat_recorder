<template>
  <div>
    <p>{{ defaultText }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'
import { browser } from 'webextension-polyfill-ts'

@Component
export default class App extends Vue {
  name = 'HelloWorld'
  mounted(): void {
    browser.runtime.sendMessage({})
  }

  get defaultText(): string {
    return browser.i18n.getMessage('extName')
  }
}
</script>

<style scoped>
p {
  font-size: 20px;
}
</style>
