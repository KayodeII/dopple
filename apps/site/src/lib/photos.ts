import type { StaticImageData } from 'next/image';
import boysTies from '@/assets/photos/boys-ties.jpg';
import classroom from '@/assets/photos/classroom.jpg';
import graduate from '@/assets/photos/graduate.jpg';
import handsRaised from '@/assets/photos/hands-raised.jpg';
import pupilsUniform from '@/assets/photos/pupils-uniform.jpg';
import staffLaptop from '@/assets/photos/staff-laptop.jpg';
import studentPortrait from '@/assets/photos/student-portrait.jpg';
import studentRuler from '@/assets/photos/student-ruler.jpg';
import teacherAtBoard from '@/assets/photos/teacher-at-board.jpg';
import teacherReading from '@/assets/photos/teacher-reading.jpg';

export interface Photo {
  src: StaticImageData;
  alt: string;
  /** Photographer, for the credits line. All photos are from Unsplash (Unsplash License). */
  credit: string;
}

export const photos = {
  boysTies: {
    src: boysTies,
    alt: 'Boys in school uniform and ties',
    credit: 'Anjan',
  },
  classroom: {
    src: classroom,
    alt: 'Pupils at their desks in a classroom',
    credit: 'Doug Linstedt',
  },
  graduate: {
    src: graduate,
    alt: 'A smiling girl in a graduation cap and gown',
    credit: 'Oyemike Princewill',
  },
  handsRaised: {
    src: handsRaised,
    alt: 'A full classroom with hands raised',
    credit: 'Emmanuel Ikwuegbu',
  },
  pupilsUniform: {
    src: pupilsUniform,
    alt: 'Smiling pupils in green and white uniforms',
    credit: 'Abubakar Balogun',
  },
  staffLaptop: {
    src: staffLaptop,
    alt: 'School staff working together on a laptop',
    credit: 'Iwaria Inc.',
  },
  studentPortrait: {
    src: studentPortrait,
    alt: 'A smiling student',
    credit: 'nana o.',
  },
  studentRuler: {
    src: studentRuler,
    alt: 'A student drawing lines with a ruler',
    credit: 'David Geneugelijk',
  },
  teacherAtBoard: {
    src: teacherAtBoard,
    alt: 'A teacher at the board with a student watching',
    credit: 'David Geneugelijk',
  },
  teacherReading: {
    src: teacherReading,
    alt: 'A teacher reading to her class',
    credit: 'Emmanuel Ikwuegbu',
  },
} satisfies Record<string, Photo>;

export const photoCredits = [
  ...new Set(Object.values(photos).map((p) => p.credit)),
];
