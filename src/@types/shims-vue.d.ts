/** .vue ファイルを TypeScript から import できるようにする型宣言. (型チェックは vue-tsc が行う) */
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}
