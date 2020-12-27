<template>
  <div>
    <p>{{ message }}</p>
  </div>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class App extends Vue {
  message = 'Hello world with TypeScript!'
}
</script>

<style lang="scss" scoped>
p {
  font-size: 20px;
}
</style>
