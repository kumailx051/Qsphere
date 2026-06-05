import img1 from '../assets/1.png'
import img2 from '../assets/2.png'
import img3 from '../assets/3.png'
import img4 from '../assets/4.png'

const STATIC_BLOG_POSTS = [
  {
    id: 1,
    title: 'The Dawn of Quantum Supremacy',
    category: 'RESEARCH',
    date: 'May 12, 2026',
    readTime: '5 min read',
    excerpt:
      'Exploring how recent breakthroughs in qubit stability are pushing the boundaries of what is computationally possible.',
    image: img1,
    author: 'QSphere Team',
    body: `Recent advances in qubit coherence times and error mitigation are enabling experiments that were previously out of reach. In this article we examine the leading hardware platforms, error correction strategies, and what 'quantum advantage' looks like in near-term devices.`,
    sections: [],
    takeaways: [
      'Qubit stability is hitting historical highs due to error mitigation.',
      'Superconducting chips are leading the race, but topological approaches show long-term promise.',
      'Quantum advantage will first be felt in chemical simulation and logistics optimization.'
    ]
  },
  {
    id: 2,
    title: 'Entanglement in Macro Systems',
    category: 'THEORY',
    date: 'Apr 28, 2026',
    readTime: '8 min read',
    excerpt:
      'A deep dive into new experiments showing quantum entanglement effects at scales previously thought impossible.',
    image: img2,
    author: 'QSphere Team',
    body: `Experiments pushing entanglement to larger systems open the door to novel sensors and fundamental tests of quantum mechanics. We cover methods, results, and implications.`,
    sections: [],
    takeaways: [
      'Macroscopic entanglement challenges traditional decoherence boundaries.',
      'SQUID devices and mechanical resonators are being entangled at micro-scales.',
      'This technology could lead to ultra-precise seismic and gravitational sensors.'
    ]
  },
  {
    id: 3,
    title: 'Quantum Cryptography Protocol v2',
    category: 'SECURITY',
    date: 'Apr 15, 2026',
    readTime: '6 min read',
    excerpt:
      'How the latest QKD (Quantum Key Distribution) protocols are securing data against future quantum attacks.',
    image: img3,
    author: 'QSphere Team',
    body: `Post-quantum secure communications are becoming practical. This post explores protocol improvements, real-world deployments, and interoperability challenges.`,
    sections: [],
    takeaways: [
      'QKD provides physical-layer security based on laws of physics.',
      'Modern fiber networks are testing hybridized post-quantum cryptography (PQC).',
      'Standardization by NIST is driving commercial adoption.'
    ]
  },
  {
    id: 4,
    title: 'Next-Gen Qubit Architecture',
    category: 'HARDWARE',
    date: 'Mar 30, 2026',
    readTime: '10 min read',
    excerpt:
      'Analyzing the shift from superconducting loops to topological qubits for better error correction.',
    image: img4,
    author: 'QSphere Team',
    body: `Topological approaches promise robust logical qubits. We review recent prototypes, fabrication challenges, and the path to scalable arrays.`,
    sections: [],
    takeaways: [
      'Topological qubits protect quantum information geometrically.',
      'Majorana zero modes remain the primary focus of topological research.',
      'Scaling up topological chips requires hybrid semiconductor-superconductor junctions.'
    ]
  },
]

const STORAGE_KEY = 'qsphere_custom_blogs'
const OVERRIDES_KEY = 'qsphere_blog_overrides'
const DELETED_KEY = 'qsphere_deleted_blog_ids'

const readJson = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch (error) {
    console.error(`Error reading ${key}:`, error)
    return fallback
  }
}

const writeJson = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value))
}

const applyBlogModifications = (blogs) => {
  const overrides = readJson(OVERRIDES_KEY, {})
  const deletedIds = new Set(readJson(DELETED_KEY, []))

  return blogs
    .filter((blog) => !deletedIds.has(blog.id))
    .map((blog) => ({
      ...blog,
      ...(overrides[blog.id] ?? {}),
    }))
}

export const getStoredBlogs = () => {
  try {
    const customBlogs = readJson(STORAGE_KEY, [])
    return applyBlogModifications([...STATIC_BLOG_POSTS, ...customBlogs])
  } catch (error) {
    console.error('Error loading stored blogs:', error)
  }
  return STATIC_BLOG_POSTS
}

export const saveNewBlog = (blogData) => {
  try {
    const currentCustom = readJson(STORAGE_KEY, [])
    
    // Generate new ID (higher than existing IDs)
    const allBlogs = getStoredBlogs()
    const maxId = allBlogs.reduce((max, b) => (b.id > max ? b.id : max), 0)
    const newId = maxId + 1

    const newBlog = {
      id: newId,
      ...blogData,
      date: new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    currentCustom.unshift(newBlog) // add new blog to the beginning of custom blogs
    writeJson(STORAGE_KEY, currentCustom)
    return newBlog
  } catch (error) {
    console.error('Error saving new blog:', error)
    return null
  }
}

export const updateStoredBlog = (blogId, blogData) => {
  try {
    const customBlogs = readJson(STORAGE_KEY, [])
    const customIndex = customBlogs.findIndex((blog) => blog.id === blogId)

    if (customIndex >= 0) {
      customBlogs[customIndex] = { ...customBlogs[customIndex], ...blogData, id: blogId }
      writeJson(STORAGE_KEY, customBlogs)
    } else {
      const overrides = readJson(OVERRIDES_KEY, {})
      overrides[blogId] = { ...(overrides[blogId] ?? {}), ...blogData, id: blogId }
      writeJson(OVERRIDES_KEY, overrides)

      const deletedIds = readJson(DELETED_KEY, []).filter((id) => id !== blogId)
      writeJson(DELETED_KEY, deletedIds)
    }

    return getStoredBlogs().find((blog) => blog.id === blogId) ?? null
  } catch (error) {
    console.error('Error updating blog:', error)
    return null
  }
}

export const deleteStoredBlog = (blogId) => {
  try {
    const customBlogs = readJson(STORAGE_KEY, [])
    const customIndex = customBlogs.findIndex((blog) => blog.id === blogId)

    if (customIndex >= 0) {
      customBlogs.splice(customIndex, 1)
      writeJson(STORAGE_KEY, customBlogs)
    } else {
      const deletedIds = new Set(readJson(DELETED_KEY, []))
      deletedIds.add(blogId)
      writeJson(DELETED_KEY, Array.from(deletedIds))
    }

    const overrides = readJson(OVERRIDES_KEY, {})
    if (overrides[blogId]) {
      delete overrides[blogId]
      writeJson(OVERRIDES_KEY, overrides)
    }

    return true
  } catch (error) {
    console.error('Error deleting blog:', error)
    return false
  }
}

const CATEGORY_STORAGE_KEY = 'qsphere_custom_categories'

export const getStoredCategories = () => {
  const defaults = ['RESEARCH', 'THEORY', 'SECURITY', 'HARDWARE']
  try {
    const raw = localStorage.getItem(CATEGORY_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      // Merge unique
      return Array.from(new Set([...defaults, ...parsed]))
    }
  } catch (error) {
    console.error('Error loading stored categories:', error)
  }
  return defaults
}

export const saveCustomCategory = (category) => {
  const trimmed = category.trim().toUpperCase()
  if (!trimmed) return false
  try {
    const current = getStoredCategories()
    if (!current.includes(trimmed)) {
      const raw = localStorage.getItem(CATEGORY_STORAGE_KEY)
      const parsed = raw ? JSON.parse(raw) : []
      parsed.push(trimmed)
      localStorage.setItem(CATEGORY_STORAGE_KEY, JSON.stringify(parsed))
      return true
    }
  } catch (error) {
    console.error('Error saving custom category:', error)
  }
  return false
}

