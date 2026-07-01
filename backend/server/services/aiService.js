import pool from '../db.js'
import {
  openCodeEndpoint,
  openCodeModel,
  openRouterEndpoint,
  openRouterModel,
} from '../config.js'
import { createHttpError } from '../utils/errors.js'

const providerCatalog = {
  openrouter: {
    id: 'openrouter',
    label: 'OpenRouter',
    endpoint: openRouterEndpoint,
    model: openRouterModel,
    guideUrl: 'https://openrouter.ai/',
    guideSteps: [
      'Open the OpenRouter website.',
      'Create an account or sign in.',
      'Generate an API key from your dashboard.',
      'Paste the key into Qubi to start using GPT OSS.',
    ],
  },
  opencode: {
    id: 'opencode',
    label: 'OpenCode',
    endpoint: openCodeEndpoint,
    model: openCodeModel,
    guideUrl: 'https://opencode.ai/zen',
    guideSteps: [
      'Open the OpenCode Zen page.',
      'Sign in and create your API key.',
      'Paste the key into Qubi to enable DeepSeek V4 Flash Free.',
    ],
  },
}

const sanitizeConnection = (row) => ({
  id: row.id,
  provider: row.provider,
  label: providerCatalog[row.provider]?.label || row.provider,
  model: row.model,
  isActive: row.isActive === true,
  created_at: row.created_at,
  updated_at: row.updated_at,
})

const getUserConnections = async (emailAddress) => {
  const result = await pool.query(
    `SELECT id, provider, model, "isActive", created_at, updated_at
     FROM user_ai_connections
     WHERE "userEmail" = $1
     ORDER BY provider ASC`,
    [emailAddress],
  )

  return result.rows.map(sanitizeConnection)
}

const getActiveConnectionRow = async (emailAddress) => {
  const result = await pool.query(
    `SELECT *
     FROM user_ai_connections
     WHERE "userEmail" = $1 AND "isActive" = TRUE
     ORDER BY updated_at DESC
     LIMIT 1`,
    [emailAddress],
  )

  return result.rows[0] || null
}

const getProviderDefinition = (provider) => {
  const normalized = String(provider || '').trim().toLowerCase()
  const definition = providerCatalog[normalized]
  if (!definition) {
    throw createHttpError(400, 'Unsupported AI provider')
  }

  return definition
}

const requestProviderCompletion = async ({ provider, apiKey, model, messages }) => {
  const providerDefinition = getProviderDefinition(provider)

  const response = await fetch(providerDefinition.endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
    }),
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw createHttpError(
      response.status === 401 ? 401 : 500,
      data.error?.message || `Failed to connect to ${providerDefinition.label}`,
    )
  }

  const content = data?.choices?.[0]?.message?.content
  if (!content) {
    throw createHttpError(500, `${providerDefinition.label} returned an empty response`)
  }

  return String(content).trim()
}

const getAiConnectionOrThrow = async (user) => {
  if (!user?.emailAddress) {
    throw createHttpError(401, 'Not authenticated')
  }

  const connection = await getActiveConnectionRow(user.emailAddress)
  if (!connection) {
    throw createHttpError(428, 'Please connect your AI API to use Qubi')
  }

  return connection
}

const runAiPrompt = async (user, messages) => {
  const connection = await getAiConnectionOrThrow(user)

  return requestProviderCompletion({
    provider: connection.provider,
    apiKey: connection.apiKey,
    model: connection.model,
    messages,
  })
}

export const getAiProviderStatus = async (user) => {
  if (!user?.emailAddress) throw createHttpError(401, 'Not authenticated')

  const connections = await getUserConnections(user.emailAddress)
  const activeConnection = connections.find((item) => item.isActive) || null

  return {
    activeProvider: activeConnection?.provider || null,
    currentModel: activeConnection?.model || null,
    providers: Object.values(providerCatalog).map((provider) => {
      const existing = connections.find((item) => item.provider === provider.id)
      return {
        id: provider.id,
        label: provider.label,
        model: provider.model,
        guideUrl: provider.guideUrl,
        guideSteps: provider.guideSteps,
        isConnected: !!existing,
        isActive: existing?.isActive === true,
      }
    }),
  }
}

export const connectAiProvider = async (user, { provider, apiKey }) => {
  if (!user?.emailAddress) throw createHttpError(401, 'Not authenticated')
  if (!apiKey || String(apiKey).trim().length < 8) {
    throw createHttpError(400, 'Please provide a valid API key')
  }

  const definition = getProviderDefinition(provider)
  const normalizedKey = String(apiKey).trim()
  const client = await pool.connect()

  try {
    await client.query('BEGIN')
    await client.query(
      `UPDATE user_ai_connections
       SET "isActive" = FALSE, updated_at = NOW()
       WHERE "userEmail" = $1`,
      [user.emailAddress],
    )

    await client.query(
      `INSERT INTO user_ai_connections ("userEmail", provider, "apiKey", model, "isActive", updated_at)
       VALUES ($1, $2, $3, $4, TRUE, NOW())
       ON CONFLICT ("userEmail", provider) DO UPDATE SET
         "apiKey" = EXCLUDED."apiKey",
         model = EXCLUDED.model,
         "isActive" = TRUE,
         updated_at = NOW()`,
      [user.emailAddress, definition.id, normalizedKey, definition.model],
    )

    await client.query('COMMIT')
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }

  return getAiProviderStatus(user)
}

export const disconnectAiProvider = async (user, provider) => {
  if (!user?.emailAddress) throw createHttpError(401, 'Not authenticated')

  const definition = getProviderDefinition(provider)
  await pool.query(
    `DELETE FROM user_ai_connections
     WHERE "userEmail" = $1 AND provider = $2`,
    [user.emailAddress, definition.id],
  )

  return getAiProviderStatus(user)
}

export const generateTopic = async (user, { topic }) => {
  if (!topic) throw createHttpError(400, 'Topic is required')
  return {
    topic: await runAiPrompt(user, [
      {
        role: 'system',
        content:
          "You are Qubi assistant, an expert SEO optimized blog topic generator. Generate exactly 1 highly optimized, catchy blog topic based on the user's input. Do not include quotes around it, just the text.",
      },
      { role: 'user', content: `Generate an SEO optimized topic for: ${topic}` },
    ]),
  }
}

export const optimizeGroupTitle = async (user, { title }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    optimized: await runAiPrompt(user, [
      {
        role: 'system',
        content:
          'You are an AI assistant. The user will provide a group title. Optimize it to be professional and catchy, but it MUST be strictly under 10 words. Return ONLY the optimized title text, without quotes.',
      },
      { role: 'user', content: `Optimize this group title: ${title}` },
    ]),
  }
}

export const generateGroupDescription = async (user, { title }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    description: await runAiPrompt(user, [
      {
        role: 'system',
        content:
          'You are an AI assistant. The user will provide a group title. Write a short, engaging description for this group (max 2 sentences). Return ONLY the description text, without quotes.',
      },
      { role: 'user', content: `Group title: ${title}` },
    ]),
  }
}

export const generateBlogExcerpt = async (user, { title, content }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    excerpt: await runAiPrompt(user, [
      {
        role: 'system',
        content:
          'You are an AI assistant. The user will provide a blog title and optionally some content. Write a short, compelling excerpt for this blog (max 1 sentence). Return ONLY the excerpt text, without quotes.',
      },
      { role: 'user', content: `Blog title: ${title}\nContent: ${content || 'N/A'}` },
    ]),
  }
}

export const generateBlogContent = async (user, { title }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    content: await runAiPrompt(user, [
      {
        role: 'system',
        content:
          'You are an AI blog writer. The user will provide a blog title. Write a well-structured, engaging blog post about this topic. Use markdown formatting (headings, bullet points, etc.). Return ONLY the blog content.',
      },
      { role: 'user', content: `Blog title: ${title}` },
    ]),
  }
}

export const suggestProjectDescription = async (user, { title }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    description: await runAiPrompt(user, [
      {
        role: 'system',
        content:
          'You are an AI assistant helping users create projects. Given a project title, generate a concise, professional project description (1-3 sentences) outlining typical goals and scope.',
      },
      { role: 'user', content: `Project Title: ${title}` },
    ]),
  }
}

export const suggestTitles = async (user, { topic }) => {
  if (!topic) throw createHttpError(400, 'Topic is required')

  const content = await runAiPrompt(user, [
    {
      role: 'system',
      content: `You are an expert SEO blog title generator. Given a topic or existing title, generate exactly 3 highly engaging, SEO-optimized titles (each under 10-15 words). Provide a simulated "SEO rating" out of 100 for each.
Format your output exactly as a JSON array of objects. Example:
[
  { "title": "The Ultimate Guide to...", "rating": 95 },
  { "title": "10 Ways to Master...", "rating": 92 },
  { "title": "Why You Need...", "rating": 89 }
]`,
    },
    { role: 'user', content: `Topic: ${topic}` },
  ])

  try {
    const match = content.match(/\[[\s\S]*\]/)
    const jsonString = match ? match[0] : content
    return { titles: JSON.parse(jsonString) }
  } catch {
    return { titles: [{ title: content.replace(/["[\]{}]/g, '').split(',')[0], rating: 90 }] }
  }
}

export const modifyText = async (user, { text, prompt, mode }) => {
  if (!text) throw createHttpError(400, 'Text is required')

  let systemPrompt =
    'You are an AI writing assistant. The user will provide some text. Modify it according to their instructions. Return ONLY the modified text, with no conversational filler.'
  if (mode === 'paraphrase') {
    systemPrompt =
      'You are an AI writing assistant. Paraphrase the following text clearly and professionally while retaining the original meaning. Return ONLY the paraphrased text.'
  }

  return {
    text: await runAiPrompt(user, [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: mode === 'paraphrase' ? text : `Instructions: ${prompt || 'Improve this text'}\n\nText: ${text}`,
      },
    ]),
  }
}

export const autocompleteText = async (user, { text, context }) => {
  if (!text) return { suggestion: '' }

  try {
    return {
      suggestion: await runAiPrompt(user, [
        {
          role: 'system',
          content:
            'You are an autocomplete AI. The user is typing a text field (e.g. description). Provide a short, logical continuation (1-5 words) that completes their thought. DO NOT repeat what they already wrote. ONLY output the continuation text. If the text seems complete, output nothing.',
        },
        { role: 'user', content: `Context: ${context || 'None'}\nCurrent text: ${text}\nContinuation:` },
      ]),
    }
  } catch {
    return { suggestion: '' }
  }
}

export const chatWithAssistant = async (user, { message }) => {
  if (!message) throw createHttpError(400, 'Message is required')
  return {
    reply: await runAiPrompt(user, [
      {
        role: 'system',
        content:
          "You are Qubi assistant. Your primary purpose is to answer questions related to 'quantum' computing, quantum physics, etc. You may politely reply to basic greetings (like 'hi', 'hello', 'how are you'). However, if the user asks a completely irrelevant question (like 'who is usa president', 'what day is tomorrow', 'write me a poem about dogs', etc.), you must reply EXACTLY with: 'sorry i only answer questions related to quantam'. Keep all answers concise and polite.",
      },
      { role: 'user', content: message },
    ]),
  }
}
