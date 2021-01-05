export default interface MessageInterface {
  type: 'YCR_LOAD_CONFIG' | 'YCR_BADGE' | 'YCR_ACTIVE'
  value?: any
}
