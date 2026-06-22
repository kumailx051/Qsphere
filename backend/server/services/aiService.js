import { openRouterModel } from '../config.js'
import { createHttpError } from '../utils/errors.js'

const requestOpenRouter = async (messages) => {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: openRouterModel,
      messages,
    }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw createHttpError(500, data.error?.message || 'Failed to fetch from OpenRouter')
  }

  return data.choices[0].message.content.trim()
}

export const generateTopic = async ({ topic }) => {
  if (!topic) throw createHttpError(400, 'Topic is required')
  return {
    topic: await requestOpenRouter([
      {
        role: 'system',
        content:
          "You are Qubi assistant, an expert SEO optimized blog topic generator. Generate exactly 1 highly optimized, catchy blog topic based on the user's input. Do not include quotes around it, just the text.",
      },
      { role: 'user', content: `Generate an SEO optimized topic for: ${topic}` },
    ]),
  }
}

export const optimizeGroupTitle = async ({ title }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    optimized: await requestOpenRouter([
      {
        role: 'system',
        content:
          'You are an AI assistant. The user will provide a group title. Optimize it to be professional and catchy, but it MUST be strictly under 10 words. Return ONLY the optimized title text, without quotes.',
      },
      { role: 'user', content: `Optimize this group title: ${title}` },
    ]),
  }
}

export const generateGroupDescription = async ({ title }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    description: await requestOpenRouter([
      {
        role: 'system',
        content:
          'You are an AI assistant. The user will provide a group title. Write a short, engaging description for this group (max 2 sentences). Return ONLY the description text, without quotes.',
      },
      { role: 'user', content: `Group title: ${title}` },
    ]),
  }
}

export const generateBlogExcerpt = async ({ title, content }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    excerpt: await requestOpenRouter([
      {
        role: 'system',
        content:
          'You are an AI assistant. The user will provide a blog title and optionally some content. Write a short, compelling excerpt for this blog (max 1 sentence). Return ONLY the excerpt text, without quotes.',
      },
      { role: 'user', content: `Blog title: ${title}\nContent: ${content || 'N/A'}` },
    ]),
  }
}

export const generateBlogContent = async ({ title }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    content: await requestOpenRouter([
      {
        role: 'system',
        content:
          'You are an AI blog writer. The user will provide a blog title. Write a well-structured, engaging blog post about this topic. Use markdown formatting (headings, bullet points, etc.). Return ONLY the blog content.',
      },
      { role: 'user', content: `Blog title: ${title}` },
    ]),
  }
}

export const suggestProjectDescription = async ({ title }) => {
  if (!title) throw createHttpError(400, 'Title is required')
  return {
    description: await requestOpenRouter([
      {
        role: 'system',
        content:
          'You are an AI assistant helping users create projects. Given a project title, generate a concise, professional project description (1-3 sentences) outlining typical goals and scope.',
      },
      { role: 'user', content: `Project Title: ${title}` },
    ]),
  }
}

export const suggestTitles = async ({ topic }) => {
  if (!topic) throw createHttpError(400, 'Topic is required')

  const content = await requestOpenRouter([
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
    return { titles: [{ title: content.replace(/["\[\]{}]/g, '').split(',')[0], rating: 90 }] }
  }
}

export const modifyText = async ({ text, prompt, mode }) => {
  if (!text) throw createHttpError(400, 'Text is required')

  let systemPrompt =
    'You are an AI writing assistant. The user will provide some text. Modify it according to their instructions. Return ONLY the modified text, with no conversational filler.'
  if (mode === 'paraphrase') {
    systemPrompt =
      'You are an AI writing assistant. Paraphrase the following text clearly and professionally while retaining the original meaning. Return ONLY the paraphrased text.'
  }

  return {
    text: await requestOpenRouter([
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: mode === 'paraphrase' ? text : `Instructions: ${prompt || 'Improve this text'}\n\nText: ${text}`,
      },
    ]),
  }
}

export const autocompleteText = async ({ text, context }) => {
  if (!text) return { suggestion: '' }

  try {
    return {
      suggestion: await requestOpenRouter([
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

export const chatWithAssistant = async ({ message }) => {
  if (!message) throw createHttpError(400, 'Message is required')
  return {
    reply: await requestOpenRouter([
      {
        role: 'system',
        content:
          "You are Qubi assistant. Your primary purpose is to answer questions related to 'quantum' computing, quantum physics, etc. You may politely reply to basic greetings (like 'hi', 'hello', 'how are you'). However, if the user asks a completely irrelevant question (like 'who is usa president', 'what day is tomorrow', 'write me a poem about dogs', etc.), you must reply EXACTLY with: 'sorry i only answer questions related to quantam'. Keep all answers concise and polite.",
      },
      { role: 'user', content: message },
    ]),
  }
}
