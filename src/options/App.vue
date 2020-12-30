<template>
  <section class="section">
    <p>{{ message }}</p>
  </section>
</template>

<script lang="ts">
import { Component, Vue } from 'vue-property-decorator'

@Component
export default class App extends Vue {
  message = 'Hello world with TypeScript!'
}
</script>
