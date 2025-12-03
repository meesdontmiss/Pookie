// Minimal in-memory chat service used by WinterChat
export type ChatMessage = {
  id: string
  username: string
  message: string
  timestamp: number
}

type Subscriber = (messages: ChatMessage[]) => void

const messages: ChatMessage[] = []
const subscribers = new Set<Subscriber>()

function notify(maxMessages?: number) {
  const snapshot = maxMessages ? messages.slice(-maxMessages) : [...messages]
  subscribers.forEach((fn) => fn(snapshot))
}

export const chatService = {
  subscribeToMessages(cb: Subscriber, maxMessages?: number) {
    subscribers.add(cb)
    cb(maxMessages ? messages.slice(-maxMessages) : messages)
    return () => subscribers.delete(cb)
  },
  async sendMessage(username: string, message: string) {
    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2),
      username,
      message,
      timestamp: Date.now(),
    }
    messages.push(msg)
    notify()
  },
}

export default chatService

