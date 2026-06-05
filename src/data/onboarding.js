export const onboardingRoles = [
  {
    id: 'student',
    label: 'Student',
    eyebrow: 'Campus track',
    title: 'Build your academic profile.',
    description: 'Capture your institute, study path, and interests so the community can connect you with the right conversations.',
  },
  {
    id: 'graduate',
    label: 'Graduate',
    eyebrow: 'Alumni track',
    title: 'Showcase your academic outcome.',
    description: 'Share your degree, discipline, and graduation details to unlock alumni focused spaces.',
  },
  {
    id: 'industry',
    label: 'Industry',
    eyebrow: 'Professional track',
    title: 'Represent your organization and role.',
    description: 'Tell us where you work, what you do, and how you collaborate with the quantum ecosystem.',
  },
  {
    id: 'faculty',
    label: 'Faculty',
    eyebrow: 'Academic track',
    title: 'Highlight your teaching and research profile.',
    description: 'Add qualification, designation, and research direction so peers can discover your work.',
  },
  {
    id: 'researcher',
    label: 'Researcher',
    eyebrow: 'Research track',
    title: 'Capture your research identity.',
    description: 'Share your institute, focus area, and collaboration interests so the network can route opportunities your way.',
  },
]

export const onboardingCommonFields = [
  { name: 'email', label: 'Email', placeholder: 'Enter email', type: 'email', required: true },
  {
    name: 'gender',
    label: 'Gender',
    type: 'select',
    required: false,
    options: ['Male', 'Female', 'Prefer not to say'],
  },
  { name: 'cellMain', label: 'Cell No. (Main)', placeholder: 'Enter cell number', type: 'tel', required: true },
  { name: 'cellAlt', label: 'Cell No. (Alternative)', placeholder: 'Enter cell number', type: 'tel', required: false },
  { name: 'cnic', label: 'C.N.I.C', placeholder: 'Enter CNIC', type: 'text', required: true },
  { name: 'passportNo', label: 'Passport No.', placeholder: 'Enter passport no.', type: 'text', required: false },
  { name: 'dob', label: 'D.O.B', type: 'date', required: true },
  { name: 'city', label: 'City', placeholder: 'Enter your city', type: 'text', required: true },
  {
    name: 'address',
    label: 'Address',
    placeholder: 'Enter your address',
    type: 'textarea',
    required: true,
    span: 2,
  },
]

export const onboardingRoleFields = {
  student: [
    { name: 'institute', label: 'Institute', placeholder: 'University or college name', type: 'text', required: true },
    { name: 'degree', label: 'Degree', placeholder: 'Program name', type: 'text', required: true },
    { name: 'semester', label: 'Semester', placeholder: 'Current semester', type: 'text', required: true },
    { name: 'majors', label: 'Majors', placeholder: 'Primary subjects', type: 'text', required: false },
    { name: 'interests', label: 'Interests', placeholder: 'Your interests', type: 'text', required: false },
    { name: 'referralId', label: 'Referral Id', placeholder: 'Optional referral code', type: 'text', required: false },
  ],
  graduate: [
    { name: 'institute', label: 'Institute', placeholder: 'University or college name', type: 'text', required: true },
    { name: 'degree', label: 'Degree', placeholder: 'Degree title', type: 'text', required: true },
    { name: 'discipline', label: 'Discipline', placeholder: 'Area of study', type: 'text', required: true },
    { name: 'interests', label: 'Interests', placeholder: 'Your interests', type: 'text', required: false },
    { name: 'graduationDate', label: 'Date of Graduation', type: 'date', required: true },
    { name: 'referralId', label: 'Referral Id', placeholder: 'Optional referral code', type: 'text', required: false },
  ],
  industry: [
    { name: 'organization', label: 'Organization', placeholder: 'Company or institution', type: 'text', required: true },
    { name: 'jobDescription', label: 'Job Description', placeholder: 'Describe your work', type: 'text', required: true },
    { name: 'roleTitle', label: 'Role', placeholder: 'Your role title', type: 'text', required: true },
    { name: 'degree', label: 'Degree', placeholder: 'Highest degree', type: 'text', required: false },
    { name: 'graduationDate', label: 'Date of Graduation', type: 'date', required: false },
  ],
  faculty: [
    { name: 'institute', label: 'Institute', placeholder: 'University or institute', type: 'text', required: true },
    { name: 'qualification', label: 'Qualification', placeholder: 'Highest qualification', type: 'text', required: true },
    { name: 'experience', label: 'Experience', placeholder: 'Years or summary', type: 'text', required: true },
    { name: 'designation', label: 'Designation', placeholder: 'Current designation', type: 'text', required: true },
    { name: 'post', label: 'Post', placeholder: 'Department or post', type: 'text', required: false },
    { name: 'researchInterest', label: 'Research Interest', placeholder: 'Research focus', type: 'text', required: false },
  ],
  researcher: [
    { name: 'institute', label: 'Institute', placeholder: 'Institute or lab name', type: 'text', required: true },
    { name: 'researchFocus', label: 'Research Focus', placeholder: 'Primary research area', type: 'text', required: true },
    { name: 'interests', label: 'Interests', placeholder: 'Collaboration interests', type: 'text', required: false },
    { name: 'referralId', label: 'Referral Id', placeholder: 'Optional referral code', type: 'text', required: false },
  ],
}
