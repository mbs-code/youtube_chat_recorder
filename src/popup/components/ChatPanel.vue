<template>
  <div v-if="chat" class="box" @click="handleClick">
    <div class="columns is-mobile is-vcentered">
      <div class="column is-narrow">
        <!-- display only -->
        <input type="checkbox" :checked="isSelected" />
      </div>
      <div class="column app-chat" :data-chatid="chat.id">
        <div>
          {{ chat.timestamp | datetimeString }}
          <span class="tag is-info is-light">{{ chat.seconds | hmsString }}</span>
        </div>
        <div> {{ chat.authorName }}: {{ chat.altMessage }}</div>
        <div v-if='chat.money'>{{ chat.moneyUnit }} {{ chat.money }}</div>
        <div v-if="chat.pngUrl">
          <img :src="chat.pngUrl" alt="chat-image"/>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { Component, Prop, Vue } from 'vue-property-decorator'
import displayFilter from '../../filters/displayFilter'
import BrowserTabs from '../../lib/chrome/BrowserTabs'
import PageHelper from '../../lib/util/PageHelper'
import Chat from '../../models/Chat'

@Component({
  filters: displayFilter,
})
export default class ChatPanel extends Vue {
  @Prop({ default: null })
  chat!: Chat | null

  @Prop({ default: false })
  isSelected?: boolean

  handleClick(): void {
    this.$emit('click', this.chat)
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
}
</style>
