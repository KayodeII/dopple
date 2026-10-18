/**
 * Every piece of marketing copy on the landing page lives here, so wording can
 * change without touching layout. Rules (see docs/context and AGENTS.md):
 *  - Write for the buyer: proprietors, principals and bursars.
 *  - Outcomes before features. Specific button labels ("Book my school's demo").
 *  - No invented testimonials, stats, logos or urgency. Partner schools come
 *    only from the API (schools that opted in).
 */

export const hero = {
  note: 'for proprietors, principals and bursars',
  lead: 'Your whole school,',
  rotatingWords: [
    { text: 'in session.', color: 'var(--color-sun)' },
    { text: 'paid up.', color: 'var(--color-mint)' },
    { text: 'on the map.', color: 'var(--color-pink)' },
    { text: 'in one place.', color: 'var(--color-sky)' },
  ],
  body: "Teach live, run exams, track every bus and collect fees straight into your school's account, without the WhatsApp groups, paper registers and payment chasing.",
  primaryCta: "Book my school's demo",
  secondaryCta: 'See a live class',
  reassurance:
    'A free 30-minute walkthrough with your own timetable. No card, no contract.',
};

export const tapeWords = [
  'Live classes',
  'Exams',
  'ID cards',
  'Bus tracking',
  'School fees',
  'Events',
  'Report cards',
  'Attendance',
  'Whiteboard',
  'Lesson library',
];

export const beforeAfter = {
  note: 'sound familiar?',
  headline: "Running a school shouldn't feel like",
  highlight: 'running six.',
  before: [
    'Twelve WhatsApp groups per class',
    'Attendance in a paper register',
    'Fee receipts in a drawer',
    '“Has the bus left?” phone calls',
    'Exam papers photocopied at midnight',
    'Report cards typed one by one',
  ],
  after: [
    'Announcements reach the right class, year or parent',
    'Attendance taken as students arrive or join',
    'Every naira matched to the right student',
    'Parents see the bus, so they stop calling',
    'Exams that mark themselves; report cards in one click',
  ],
};

export const roles = [
  {
    tag: 'Students',
    tagColor: 'var(--color-sun)',
    title: 'Join class, catch up,',
    accent: 'sit the exam.',
    body: 'Live lessons, the lesson library, assignments and results in one place.',
    photo: 'studentPortrait',
    focus: 'center 20%',
  },
  {
    tag: 'Teachers',
    tagColor: 'var(--color-mint)',
    title: 'Teach live,',
    accent: 'mark less.',
    body: 'Teach to the room or to screens at home. Attendance and objective marking happen on their own.',
    photo: 'teacherReading',
    focus: '25% center',
  },
  {
    tag: 'Parents',
    tagColor: 'var(--color-coral)',
    title: 'Every milestone,',
    accent: 'in your pocket.',
    body: 'Results, attendance, the bus on a map and fees paid in a few taps.',
    photo: 'graduate',
    focus: '30% center',
  },
  {
    tag: 'Administrators',
    tagColor: 'var(--color-violet)',
    title: 'Run the whole school',
    accent: 'from one desk.',
    body: 'Admissions, timetables, report cards, ID cards and fee balances.',
    photo: 'staffLaptop',
    focus: '60% center',
  },
] as const;

export const schoolDay = [
  {
    time: '07:40',
    photo: 'boysTies',
    title: 'Through the gate',
    body: 'Students tap their ID card; parents get a check-in alert.',
    chip: 'Checked in · 07:42',
    dot: 'var(--color-mint)',
  },
  {
    time: '08:40',
    photo: 'classroom',
    title: 'First lesson',
    body: 'Class starts on time, in the room or online, with attendance taken as they join.',
    chip: 'JSS2 Maths · 34 present',
    dot: 'var(--color-sun)',
  },
  {
    time: '10:20',
    photo: 'handsRaised',
    title: 'Hands up',
    body: 'Polls and questions during the lesson; every answer is counted.',
    chip: '29 of 34 answered',
    dot: 'var(--color-violet)',
  },
  {
    time: '11:30',
    photo: 'studentRuler',
    title: 'Exam time',
    body: 'A timed paper unlocks at 11:30 and saves every answer as they write.',
    chip: 'Basic Science · 40:00',
    dot: 'var(--color-coral)',
  },
  {
    time: '15:10',
    photo: 'pupilsUniform',
    title: 'Home time',
    body: 'The bus leaves, parents watch it on the map, and tomorrow is already planned.',
    chip: 'Bus 2 · 5 min away',
    dot: 'var(--color-sky)',
  },
] as const;

export const onboardingSteps = [
  {
    title: 'Sign up the school',
    body: 'Add your classes, staff and students, or import them from a spreadsheet.',
  },
  {
    title: 'Claim your address',
    body: 'Start on yourschool.dopple.school, or point your own domain at Dopple.',
  },
  {
    title: 'Invite your teachers',
    body: "Staff sign in at your school's own address and find their classes already waiting.",
  },
  {
    title: 'Ring the first bell',
    body: 'Your timetable goes live and every class has its room waiting.',
  },
];

export const library = [
  {
    subject: 'MATHS · JSS2',
    title: 'Simultaneous equations',
    meta: 'Mr. Okafor · 41 min',
    bg: 'var(--color-sun)',
    ink: 'var(--color-ink)',
    glyph: 'x',
  },
  {
    subject: 'BASIC SCIENCE',
    title: 'States of matter',
    meta: 'Mrs. Adeyemi · 35 min',
    bg: 'var(--color-mint)',
    ink: 'var(--color-ink)',
    glyph: 'H',
  },
  {
    subject: 'ENGLISH',
    title: 'Writing a formal letter',
    meta: 'Ms. Bello · 28 min',
    bg: 'var(--color-paper)',
    ink: 'var(--color-ink)',
    glyph: 'Aa',
  },
  {
    subject: 'SOCIAL STUDIES',
    title: 'Our community',
    meta: 'Mr. Eze · 32 min',
    bg: 'var(--color-coral)',
    ink: 'var(--color-ink)',
    glyph: '○',
  },
  {
    subject: 'MUSIC',
    title: 'Rhythm and beat',
    meta: 'Mrs. Udo · 24 min',
    bg: 'var(--color-violet)',
    ink: 'var(--color-ink)',
    glyph: '♪',
  },
  {
    subject: 'COMPUTER STUDIES',
    title: 'Your first algorithm',
    meta: 'Mr. Lawal · 38 min',
    bg: 'var(--color-graphite)',
    ink: 'var(--color-paper)',
    glyph: '{ }',
  },
  {
    subject: 'AGRIC SCIENCE',
    title: 'Soil and seeds',
    meta: 'Mr. Okon · 30 min',
    bg: 'var(--color-sky)',
    ink: 'var(--color-ink)',
    glyph: 'S',
  },
  {
    subject: 'FRENCH',
    title: 'Bonjour, la classe',
    meta: 'Mme. Diallo · 26 min',
    bg: 'var(--color-pink)',
    ink: 'var(--color-ink)',
    glyph: 'é',
  },
  {
    subject: 'PHYSICS · SS1',
    title: 'Motion and force',
    meta: 'Mr. Ibrahim · 44 min',
    bg: 'var(--color-paper)',
    ink: 'var(--color-ink)',
    glyph: 'F',
  },
  {
    subject: 'HISTORY',
    title: 'The road to 1960',
    meta: 'Mrs. Nwosu · 36 min',
    bg: 'var(--color-sun)',
    ink: 'var(--color-ink)',
    glyph: '60',
  },
];

export const promises = [
  {
    title: 'Your school, your address',
    body: 'yourschool.dopple.school, or your own domain, in your colours.',
  },
  {
    title: 'Fees land in your account',
    body: "Parents pay online; money settles straight to the school's bank account.",
  },
  {
    title: 'Lessons survive bad networks',
    body: 'Video steps down to audio and slides instead of dropping the class.',
  },
  {
    title: 'Your data stays yours',
    body: 'Walled off from every other school; export or delete it any time.',
  },
  {
    title: 'Nothing new to learn',
    body: 'If you can use WhatsApp, you can use Dopple. We train your staff.',
  },
  {
    title: 'One simple price',
    body: 'Per student, per term. No surprise add-ons.',
  },
];

export const reliability = [
  {
    title: 'Ready before the bell',
    body: 'Capacity follows your timetable, not the morning rush.',
  },
  {
    title: 'Kind to weak networks',
    body: 'Video adapts per student and falls back to audio and slides.',
  },
  {
    title: 'Every school walled off',
    body: "Each school's data stays its own, checked again in the database.",
  },
  {
    title: 'Assemblies included',
    body: 'Whole-school sessions switch to broadcast so everyone can watch.',
  },
];

export const faqs = [
  {
    q: 'Does every school get its own website?',
    a: "Yes. Each school starts on yourschool.dopple.school and can point its own domain, such as learn.yourschool.edu.ng, at Dopple. The school's name, logo and colours appear throughout.",
  },
  {
    q: "What happens when a student's internet is weak?",
    a: 'Video automatically drops to a lower quality, then to audio with slides. The whiteboard keeps working through a dropped connection and catches up when it returns, and lessons can be downloaded to watch later.',
  },
  {
    q: 'How do school fees reach our account?',
    a: "Parents pay by card or bank transfer through a licensed payment provider. Money settles directly into the school's own bank account; Dopple never holds it. Every payment is matched to the right student automatically. Coming soon: Pay small small, so parents can spread a term's fees into smaller payments.",
  },
  {
    q: 'Can students take exams from home?',
    a: 'Yes. Papers unlock at the start time and answers save as students go. Exams can run in a locked full-screen mode, and leaving the exam is flagged to the teacher.',
  },
  {
    q: 'Is our data kept separate from other schools?',
    a: "Yes. Each school's records are isolated at every layer, down to the database, and the school can export or delete its data at any time.",
  },
  {
    q: 'How long does it take to get started?',
    a: "Most of the work is importing your students, classes and timetable, which we do with you from a spreadsheet. Students and parents just open your school's web address; there is nothing for them to install.",
  },
];

/** Prices are not set yet: keep placeholders visible rather than inventing numbers. */
export const plans = [
  {
    name: 'Starter',
    price: '[PRICE]',
    body: 'Live classes, whiteboard, attendance, grades and events on a dopple.school address.',
    cta: 'Start my school on Starter',
    featured: false,
  },
  {
    name: 'School',
    price: '[PRICE]',
    body: 'Everything in Starter, plus exams, ID cards, fees, bus tracking, your own domain and the lesson library.',
    cta: "Book my school's demo",
    featured: true,
  },
  {
    name: 'Group and district',
    price: 'Custom',
    body: 'Dedicated infrastructure, data residency and single sign-on across many schools.',
    cta: 'Plan a rollout for our schools',
    featured: false,
  },
];

export const footerLinks = [
  {
    title: 'Product',
    links: [
      ['Live classes', '#product'],
      ['Exams', '#modules'],
      ['ID cards', '#modules'],
      ['Bus tracking', '#modules'],
      ['School fees', '#modules'],
      ['Lesson library', '#library'],
    ],
  },
  {
    title: 'Schools',
    links: [
      ['Nursery and primary', '#'],
      ['Secondary', '#'],
      ['School groups', '#'],
      ['Pricing', '#pricing'],
      ['Partner schools', '#partners'],
    ],
  },
  {
    title: 'Resources',
    links: [
      ['Help centre', '#'],
      ['Onboarding guide', '#'],
      ['Security', '#'],
      ['Data protection', '#'],
      ['System status', '#'],
    ],
  },
  {
    title: 'Company',
    links: [
      ['About', '#'],
      ['Careers', '#'],
      ['Contact', 'mailto:hello@dopple.school'],
      ['Become a partner', '#'],
    ],
  },
] as const;

export const contact = { email: 'hello@dopple.school', city: 'Lagos, Nigeria' };

/** Log in: people find their school, then sign in on its own address (ADR 0010). */
export const findSchool = {
  eyebrow: 'Log in',
  title: 'Find your school',
  body: "Every school on Dopple has its own address. Search for yours and we'll take you to its sign-in page.",
  label: 'School name or address',
  placeholder: 'e.g. Greenfield College',
  hint: 'Type at least two letters.',
  noMatch: 'No school matches that.',
  unavailable: 'School search is unavailable right now. Try again in a minute.',
  newSchool: 'Setting up a new school?',
  newSchoolCta: 'Start your school',
};

/** Start your school: self-serve sign-up. Copy for the form and its fields. */
export const startSchool = {
  eyebrow: 'Start your school',
  title: 'Your school, on its own address',
  body: "Create your school and its first admin account. You'll sign in straight away and can add classes, staff and students.",
  schoolHeading: 'Your school',
  adminHeading: 'Your admin account',
  fields: {
    name: 'School name',
    slug: 'Web address',
    city: 'City (optional)',
    brandColor: 'School colour',
    adminName: 'Your name',
    adminEmail: 'Your email',
    password: 'Password',
  },
  passwordHint: 'At least 10 characters.',
  colourHint:
    'Used across your school’s app. You can change it, and add a logo, later.',
  submit: 'Create my school',
  submitting: 'Creating your school…',
  haveSchool: 'Already on Dopple?',
  haveSchoolCta: 'Find your school',
};

/** Dopple Learn: free lessons and exam practice for anyone (ADR 0011). */
export const learn = {
  eyebrow: 'Dopple Learn · free',
  title: 'Learn for free, from nursery to SS 3',
  body: 'Short lessons and practice questions that follow the Nigerian curriculum. No school fees and no sign-up: if you can open this page, you can learn.',
  dataNote: 'Lessons are mostly text, so they load quickly and use very little data.',
  pickClass: 'Pick a class',
  lessons: (n: number) => (n === 1 ? '1 lesson' : `${n} lessons`),
  noLessons: 'Coming soon',
  growing:
    'Dopple Learn is new. We are adding lessons class by class, starting with English and Mathematics, and every lesson is checked by a teacher before it goes up.',
  unavailable:
    'Lessons could not load just now. Check your connection and try again in a minute.',
  alsoTaught: (className: string) =>
    `Other subjects in ${className}, lessons coming soon`,
  /** Strings only: passed to the practice component, which runs in the browser. */
  practice: {
    title: 'Practise',
    intro:
      'Pick an answer to see if you are right and why. Your best score stays on this phone, and nothing is sent to us.',
    tryAgain: 'Try again',
    correct: 'Correct.',
    wrong: 'Not quite: the answer is {letter}.',
    score: 'You got {right} of {total}.',
    best: 'Your best: {right} of {total}',
  },
  exams: {
    title: 'The exams ahead',
    body: 'What each exam is for, and when you sit it. Check dates and fees with the exam body before you register.',
    list: [
      {
        name: 'Common Entrance (NCEE)',
        by: 'NECO',
        when: 'Primary 6',
        what: 'Entrance to JSS 1 in Federal Unity Colleges. States run their own entrance exams for state schools.',
      },
      {
        name: 'BECE (Junior WAEC)',
        by: 'NECO or your state',
        when: 'JSS 3',
        what: 'The end of junior secondary, and the step into SS 1.',
      },
      {
        name: 'WASSCE',
        by: 'WAEC',
        when: 'SS 3, or any time after school',
        what: 'In school in May and June. Out of school, as a private candidate: computer-based, twice a year.',
      },
      {
        name: 'NECO SSCE',
        by: 'NECO',
        when: 'SS 3, or any time after school',
        what: 'In school in June and July. Out of school, the external exam (GCE) runs in November and December.',
      },
      {
        name: 'NBC / NTC',
        by: 'NABTEB',
        when: 'Technical and business students',
        what: 'Business and technical certificates, accepted like WASSCE for many courses, plus trade certificates.',
      },
      {
        name: 'UTME',
        by: 'JAMB',
        when: 'Before university, polytechnic or college of education',
        what: 'A computer-based exam: Use of English plus three subjects your course needs, then each school’s Post-UTME. You must be 16 by admission.',
      },
    ],
    credits:
      'Most universities ask for five credits (A1 to C6) in WASSCE or NECO, including English and Mathematics, from no more than two sittings.',
  },
};
