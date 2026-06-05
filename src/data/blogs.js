import img1 from '../assets/1.png'
import img2 from '../assets/2.png'
import img3 from '../assets/3.png'
import img4 from '../assets/4.png'

export const BLOG_POSTS = [
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
    body: `
      Recent advances in qubit coherence times and error mitigation are enabling experiments
      that were previously out of reach. In this article we examine the leading hardware
      platforms, error correction strategies, and what 'quantum advantage' looks like
      in near-term devices.
    `,
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
    body: `
      Experiments pushing entanglement to larger systems open the door to novel sensors
      and fundamental tests of quantum mechanics. We cover methods, results, and implications.
    `,
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
    body: `
      Post-quantum secure communications are becoming practical. This post explores protocol
      improvements, real-world deployments, and interoperability challenges.
    `,
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
    body: `
      Topological approaches promise robust logical qubits. We review recent prototypes,
      fabrication challenges, and the path to scalable arrays.
    `,
  },
]

export default BLOG_POSTS
