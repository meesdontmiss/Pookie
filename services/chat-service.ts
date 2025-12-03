// Stub chat service
export class ChatService {
  static async sendMessage(message: string) {
    console.log('Chat message:', message)
  }

  static async getMessages() {
    return []
  }
}

export default ChatService

