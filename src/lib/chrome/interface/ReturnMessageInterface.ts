import MessageInterface from './MessageInterface'

export default interface ReturnMessageInterface {
  message: MessageInterface
  response: boolean | Error
}
