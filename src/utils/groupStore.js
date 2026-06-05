const STORAGE_KEY = 'qsphere_custom_groups'
const OVERRIDES_KEY = 'qsphere_group_overrides'
const DELETED_KEY = 'qsphere_deleted_group_ids'

const DEFAULT_GROUPS = [
  {
    id: 1,
    title: 'QR in Network Management',
    description: 'Q. Secure and Efficient network management system',
    owner: 'Ghulam Murtaza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Ghulam',
  },
  {
    id: 2,
    title: 'Kyber Linux Efficient Implementation',
    description: 'Secure and Efficient Implementation of Kyber in Linux',
    owner: 'Ghulam Murtaza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Murtaza',
  },
  {
    id: 3,
    title: 'Quantum Resilient',
    description: 'Resiliency in Quantum Computing',
    owner: 'Ghulam Murtaza',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Resilient',
  },
  {
    id: 4,
    title: 'PQ Development',
    description: 'Algorithms Development',
    owner: 'Anjum Ashraaf',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Anjum',
  },
]

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

const applyGroupModifications = (groups) => {
  const overrides = readJson(OVERRIDES_KEY, {})
  const deletedIds = new Set(readJson(DELETED_KEY, []))

  return groups
    .filter((group) => !deletedIds.has(group.id))
    .map((group) => ({
      ...group,
      ...(overrides[group.id] ?? {}),
    }))
}

export const getStoredGroups = () => {
  try {
    const customGroups = readJson(STORAGE_KEY, [])
    return applyGroupModifications([...DEFAULT_GROUPS, ...customGroups])
  } catch (error) {
    console.error('Error loading stored groups:', error)
    return DEFAULT_GROUPS
  }
}

export const saveNewGroup = (groupData) => {
  try {
    const customGroups = readJson(STORAGE_KEY, [])
    const currentGroups = getStoredGroups()
    const maxId = currentGroups.reduce((max, group) => (group.id > max ? group.id : max), 0)
    const newGroup = {
      id: maxId + 1,
      ...groupData,
      avatar:
        groupData.avatar ||
        `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(groupData.owner || groupData.title || `group-${maxId + 1}`)}`,
      createdAt: new Date().toISOString(),
    }

    customGroups.unshift(newGroup)
    writeJson(STORAGE_KEY, customGroups)
    return newGroup
  } catch (error) {
    console.error('Error saving new group:', error)
    return null
  }
}

export const updateStoredGroup = (groupId, groupData) => {
  try {
    const customGroups = readJson(STORAGE_KEY, [])
    const customIndex = customGroups.findIndex((group) => group.id === groupId)

    if (customIndex >= 0) {
      customGroups[customIndex] = { ...customGroups[customIndex], ...groupData, id: groupId }
      writeJson(STORAGE_KEY, customGroups)
    } else {
      const overrides = readJson(OVERRIDES_KEY, {})
      overrides[groupId] = { ...(overrides[groupId] ?? {}), ...groupData, id: groupId }
      writeJson(OVERRIDES_KEY, overrides)

      const deletedIds = readJson(DELETED_KEY, []).filter((id) => id !== groupId)
      writeJson(DELETED_KEY, deletedIds)
    }

    return getStoredGroups().find((group) => group.id === groupId) ?? null
  } catch (error) {
    console.error('Error updating group:', error)
    return null
  }
}

export const deleteStoredGroup = (groupId) => {
  try {
    const customGroups = readJson(STORAGE_KEY, [])
    const customIndex = customGroups.findIndex((group) => group.id === groupId)

    if (customIndex >= 0) {
      customGroups.splice(customIndex, 1)
      writeJson(STORAGE_KEY, customGroups)
    } else {
      const deletedIds = new Set(readJson(DELETED_KEY, []))
      deletedIds.add(groupId)
      writeJson(DELETED_KEY, Array.from(deletedIds))
    }

    const overrides = readJson(OVERRIDES_KEY, {})
    if (overrides[groupId]) {
      delete overrides[groupId]
      writeJson(OVERRIDES_KEY, overrides)
    }

    return true
  } catch (error) {
    console.error('Error deleting group:', error)
    return false
  }
}