<template>
  <div>
    <template v-for="chat in chats">
      <ChatPanel
        :key="chat.id"
        :chat="chat"
        :class="{ 'is-active': isSelectedChat(chat) }"
        @click="handleSelected(chat)"
      />
    </template>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue, Watch } from 'vue-property-decorator'
import ChatPanel from './ChatPanel.vue'

import Video from '../../models/Video'
import BrowserTabs from '../../lib/chrome/BrowserTabs'
import PageHelper from '../../lib/util/PageHelper'
import Chat from '../../models/Chat'

@Component({
  components: { ChatPanel },
})
export default class ChatList extends Vue {
  // isActive = false
  selecteds: Chat[] = []

  @Prop({ default: [] })
  chats!: Chat[]

  isSelectedChat(chat: Chat): boolean {
    const find = this.selecteds.find(selected => chat && chat?.id === selected?.id)
    return chat && Boolean(find)
  }

  handleSelected(chat: Chat) {
    const index = this.selecteds.findIndex(selected => chat && chat?.id === selected?.id)
    if (index >= 0) {
      // 選択していたら削除する
      this.selecteds.splice(index, 1)
      this.$emit('change', this.selecteds)
    } else {
      // 選択していないなら選択
      this.selecteds.push(chat)
      this.$emit('change', this.selecteds)
    }
  }
}
</script>

<style lang="scss" scoped>
.is-active {
  background: blue !important;
}
</style>
