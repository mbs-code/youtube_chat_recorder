export default interface MessageInterface {
  type: 'LOAD_CONFIG' | 'BADGE' | 'ACTIVE'
  value?: any
}
