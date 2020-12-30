<template>
  <div v-if="chat" @click="handleClick">
    {{ chat }}
  </div>
</template>

<script lang="ts">
import { format as dateFormat, formatDistanceToNow } from 'date-fns'
import jaLocale from 'date-fns/locale/ja'

import { Component, Prop, Vue } from 'vue-property-decorator'
import Chat from '../../models/Chat'

@Component({
  filters: {
    datetimeString(date?: Date): string {
      if (date) return dateFormat(date, 'yyyy-MM-dd HH:mm:ss')
      return '-'
    },
    distanceHumanized(date?: Date): string {
      if (date) return formatDistanceToNow(date, { addSuffix: true, locale: jaLocale })
      return '-'
    }
  }
})
export default class ChatPanel extends Vue {
  @Prop({ default: null })
  chat!: Chat | null

  handleClick(): void {
    this.$emit('click', this.chat)
  }
}
</script>
