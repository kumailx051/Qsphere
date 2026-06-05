const STORAGE_KEY = 'qsphere_group_cache'
const LEGACY_STORAGE_KEY = 'qsphere_custom_groups'
const LEGACY_OVERRIDES_KEY = 'qsphere_group_overrides'
const LEGACY_DELETED_KEY = 'qsphere_deleted_group_ids'

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
  const overrides = readJson(LEGACY_OVERRIDES_KEY, {})
  const deletedIds = new Set(readJson(LEGACY_DELETED_KEY, []))

  return groups
    .filter((group) => !deletedIds.has(group.id))
    .map((group) => ({
      ...group,
      ...(overrides[group.id] ?? {}),
    }))
}

export const getStoredGroups = () => {
  try {
    const cachedGroups = readJson(STORAGE_KEY, null)
    if (Array.isArray(cachedGroups) && cachedGroups.length > 0) {
      return cachedGroups
    }

    const customGroups = readJson(LEGACY_STORAGE_KEY, [])
    return applyGroupModifications([...DEFAULT_GROUPS, ...customGroups])
  } catch (error) {
    console.error('Error loading stored groups:', error)
    return DEFAULT_GROUPS
  }
}

const broadcastGroupsUpdated = () => {
  window.dispatchEvent(new Event('qsphere-groups-updated'))
}

const syncGroupsToApi = async (method, group = null) => {
  try {
    const response = await fetch('/api/groups', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: group ? JSON.stringify(group) : undefined,
    })

    if (!response.ok) {
      throw new Error(`API request failed with status ${response.status}`)
    }

    const payload = await response.json()
    if (Array.isArray(payload)) {
      writeJson(STORAGE_KEY, payload)
      broadcastGroupsUpdated()
      return payload
    }

    return payload
  } catch (error) {
    console.error('Error syncing groups with API:', error)
    return null
  }
}

export const hydrateGroupsCache = async () => {
  try {
    const response = await fetch('/api/groups')
    if (!response.ok) return getStoredGroups()

    const groups = await response.json()
    if (Array.isArray(groups) && groups.length > 0) {
      writeJson(STORAGE_KEY, groups)
      broadcastGroupsUpdated()
      return groups
    }
  } catch (error) {
    console.error('Error hydrating groups cache:', error)
  }

  return getStoredGroups()
}

export const saveNewGroup = (groupData) => {
  try {
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

    const nextGroups = [newGroup, ...currentGroups]
    writeJson(STORAGE_KEY, nextGroups)
    broadcastGroupsUpdated()
    void syncGroupsToApi('POST', newGroup)
    return newGroup
  } catch (error) {
    console.error('Error saving new group:', error)
    return null
  }
}

export const updateStoredGroup = (groupId, groupData) => {
  try {
    const currentGroups = getStoredGroups()
    const updatedGroups = currentGroups.map((group) =>
      group.id === groupId ? { ...group, ...groupData, id: groupId } : group,
    )

    writeJson(STORAGE_KEY, updatedGroups)
    broadcastGroupsUpdated()
    void syncGroupsToApi('PUT', { id: groupId, ...groupData })

    return updatedGroups.find((group) => group.id === groupId) ?? null
  } catch (error) {
    console.error('Error updating group:', error)
    return null
  }
}

export const deleteStoredGroup = (groupId) => {
  try {
    const currentGroups = getStoredGroups()
    const nextGroups = currentGroups.filter((group) => group.id !== groupId)
    writeJson(STORAGE_KEY, nextGroups)
    broadcastGroupsUpdated()
    void syncGroupsToApi('DELETE', { id: groupId })

    return true
  } catch (error) {
    console.error('Error deleting group:', error)
    return false
  }
}