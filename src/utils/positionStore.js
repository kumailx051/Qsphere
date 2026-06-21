export const POSITIONS_STORAGE_KEY = 'qsphere_positions'

export const DEFAULT_POSITIONS = [
  {
    id: 'default-intern',
    title: 'Quantum Software Engineer Intern',
    type: 'Intern',
    location: 'Remote',
    contact: 'careers@qsphere.org',
    deadline: '2026-08-01',
    requirements:
      'Proficiency in Python, experience with Qiskit or Cirq, basic understanding of quantum linear algebra.',
    description:
      'Work with our research team to implement and benchmark variational quantum algorithms (VQE and QAOA) on cloud quantum processors.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-crypto',
    title: 'Research Assistant in Quantum Cryptography',
    type: 'Research Assistant',
    location: 'Hybrid',
    contact: 'lab@qsphere.org',
    deadline: '2026-09-15',
    requirements:
      'Enrolled in Physics or Computer Science program, understanding of post-quantum cryptography algorithms (lattice-based).',
    description:
      'Help analyze the security parameters of QKD protocols and assist in setting up experimental lab demonstrations.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
  {
    id: 'default-collab',
    title: 'Quantum Machine Learning Collaborator',
    type: 'Collaborator',
    location: 'Remote',
    contact: 'ml@qsphere.org',
    deadline: '2026-10-01',
    requirements:
      'Background in ML/DL, familiarity with quantum computing concepts, experience with PyTorch or TensorFlow.',
    description:
      'Collaborate on a cross-institutional project exploring quantum-enhanced kernels for classical ML pipelines. Publish results in a peer-reviewed journal.',
    createdAt: '2026-01-01T00:00:00.000Z',
  },
]

export const getStoredPositions = () => {
  try {
    const stored = localStorage.getItem(POSITIONS_STORAGE_KEY)
    if (stored) {
      const parsed = JSON.parse(stored)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    return DEFAULT_POSITIONS
  }

  return DEFAULT_POSITIONS
}

export const getPositionById = (positionId) => {
  const normalizedId = String(positionId || '')
  return getStoredPositions().find((position) => String(position.id) === normalizedId) ?? null
}

export const splitPositionRequirements = (requirements) => {
  if (!requirements) return []
  return String(requirements)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export const parsePositionDeadline = (dateStr) => {
  if (!dateStr) {
    return {
      label: 'No deadline',
      urgent: false,
      closed: false,
      full: 'Open until filled',
    }
  }

  const date = new Date(dateStr)
  const diff = date.getTime() - Date.now()
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))

  return {
    label:
      days <= 0
        ? 'Closed'
        : days <= 7
          ? `${days} day${days > 1 ? 's' : ''} left`
          : date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    urgent: days > 0 && days <= 14,
    closed: days <= 0,
    full: date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
  }
}
