import type { ReactNode } from 'react';
import { isoDate } from '../lib/dates';
import { NIGERIAN_STATES, RELIGIONS } from '../lib/nigeria';
import type { Student, StudentProfile } from '../lib/types';
import { Field, Select } from './ui';

export type StudentInput = Pick<
  Student,
  'admissionNo' | 'firstName' | 'lastName'
> &
  StudentProfile;

/** What the fields below hold. Blank text and unchosen options are sent as null. */
export function readStudentForm(form: FormData): StudentInput {
  const text = (name: string) => String(form.get(name) ?? '').trim() || null;
  return {
    admissionNo: String(form.get('admissionNo')),
    firstName: String(form.get('firstName')),
    middleName: text('middleName'),
    lastName: String(form.get('lastName')),
    sex: text('sex') as StudentInput['sex'],
    dateOfBirth: text('dateOfBirth'),
    admittedOn: text('admittedOn'),
    nationality: text('nationality'),
    stateOfOrigin: text('stateOfOrigin'),
    lga: text('lga'),
    homeAddress: text('homeAddress'),
    previousSchool: text('previousSchool'),
    religion: text('religion') as StudentInput['religion'],
  };
}

/**
 * The admission form, grouped as Nigerian schools' paper forms are. Only the
 * admission number and names are required; the rest can be filled in later.
 */
export function StudentFields({ student }: { student?: StudentInput }) {
  const today = isoDate(new Date());
  return (
    <div className="flex flex-col gap-6">
      <Group title="Name and admission">
        <Field
          label="Admission number"
          name="admissionNo"
          defaultValue={student?.admissionNo}
          required
          maxLength={30}
        />
        <Field
          label="Date admitted"
          name="admittedOn"
          type="date"
          max={today}
          defaultValue={student?.admittedOn ?? ''}
        />
        <Field
          label="First name"
          name="firstName"
          defaultValue={student?.firstName}
          required
          maxLength={80}
        />
        <Field
          label="Middle name"
          name="middleName"
          defaultValue={student?.middleName ?? ''}
          maxLength={80}
        />
        <Field
          label="Last name"
          name="lastName"
          defaultValue={student?.lastName}
          required
          maxLength={80}
        />
      </Group>

      <Group title="Personal details">
        <Select label="Sex" name="sex" defaultValue={student?.sex ?? ''}>
          <option value="">Not given</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </Select>
        <Field
          label="Date of birth"
          name="dateOfBirth"
          type="date"
          max={today}
          defaultValue={student?.dateOfBirth ?? ''}
        />
        <Select
          label="Religion (optional)"
          name="religion"
          defaultValue={student?.religion ?? ''}
        >
          <option value="">Not given</option>
          {Object.entries(RELIGIONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </Group>

      <Group title="Origin and address">
        <Field
          label="Nationality"
          name="nationality"
          placeholder="Nigerian"
          defaultValue={student?.nationality ?? ''}
          maxLength={60}
        />
        <Select
          label="State of origin"
          name="stateOfOrigin"
          defaultValue={student?.stateOfOrigin ?? ''}
        >
          <option value="">Not given</option>
          {NIGERIAN_STATES.map((state) => (
            <option key={state} value={state}>
              {state}
            </option>
          ))}
        </Select>
        <Field
          label="LGA"
          name="lga"
          defaultValue={student?.lga ?? ''}
          maxLength={80}
        />
        <Field
          label="Home address"
          name="homeAddress"
          autoComplete="off"
          defaultValue={student?.homeAddress ?? ''}
          maxLength={300}
        />
      </Group>

      <Group title="Before this school">
        <Field
          label="Previous school"
          name="previousSchool"
          defaultValue={student?.previousSchool ?? ''}
          maxLength={120}
        />
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-[13px] font-semibold tracking-wide text-fg-3 uppercase">
        {title}
      </legend>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        {children}
      </div>
    </fieldset>
  );
}
