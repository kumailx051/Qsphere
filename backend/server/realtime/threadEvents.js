const threadSubscribers = new Map()

const getSubscribers = (threadId) => {
  const key = String(threadId)
  if (!threadSubscribers.has(key)) {
    threadSubscribers.set(key, new Set())
  }
  return threadSubscribers.get(key)
}

export const subscribeToThread = (threadId, response) => {
  const subscribers = getSubscribers(threadId)
  subscribers.add(response)

  return () => {
    subscribers.delete(response)
    if (subscribers.size === 0) {
      threadSubscribers.delete(String(threadId))
    }
  }
}

export const publishThreadEvent = (threadId, payload) => {
  const subscribers = threadSubscribers.get(String(threadId))
  if (!subscribers || subscribers.size === 0) return

  const data = `data: ${JSON.stringify(payload)}\n\n`
  for (const response of subscribers) {
    response.write(data)
  }
}
