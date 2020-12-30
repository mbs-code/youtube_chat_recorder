<template>
  <div>
    <template v-for="chat in chats">
      <ChatPanel
        :key="chat.id"
        :chat="chat"
        :isSelected="isSelectedChat(chat)"
        class="list-item"
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
  selecteds: Chat[] = []

  @Prop({ default: [] })
  chats!: Chat[]

  isSelectedChat(chat: Chat): boolean {
    const find = this.selecteds.find(selected => chat && chat?.id === selected?.id)
    return chat && Boolean(find)
  }

  handleSelected(chat: Chat): void {
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

  ///
  // 外部操作用

  selectedAll(): void {
    this.selecteds.splice(0, this.selecteds.length)
    this.selecteds.push(...this.chats)
    this.$emit('change', this.selecteds)
  }

  unselectedAll(): void {
    this.selecteds.splice(0, this.selecteds.length)
    this.$emit('change', this.selecteds)
  }
}
</script>

<style lang="scss" scoped>
.list-item {
  border: solid 1px gainsboro;

  &.is-active {
    background: aliceblue;
    border: solid 1px dodgerblue;
  }

  &:hover {
    background: gainsboro !important;
    // color: white;
  }
}
</style>
