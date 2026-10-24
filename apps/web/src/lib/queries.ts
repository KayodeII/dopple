import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from './api';
import type {
  AcademicSession,
  ClassStudent,
  ClassSubject,
  Fee,
  Lesson,
  PaymentAccount,
  School,
  SchoolClass,
  Student,
  StudentDetail,
} from './types';

/** Data hooks. Query keys start with the resource, so a write can refresh everything that shows it. */

export const useSchool = () =>
  useQuery({
    queryKey: ['school'],
    queryFn: () => api<School>('/school'),
    staleTime: Infinity,
  });

export const useSessions = () =>
  useQuery({
    queryKey: ['sessions'],
    queryFn: () => api<AcademicSession[]>('/sessions'),
    staleTime: 5 * 60_000,
  });

export const useMyTimetable = (termId: string | undefined) =>
  useQuery({
    queryKey: ['timetable', 'me', termId],
    queryFn: () => api<Lesson[]>(`/timetable/me?termId=${termId}`),
    enabled: !!termId,
  });

export const useStudents = (q: string) =>
  useQuery({
    queryKey: ['students', q],
    queryFn: () =>
      api<Student[]>(`/students${q ? `?q=${encodeURIComponent(q)}` : ''}`),
    placeholderData: (previous) => previous,
  });

export const useStudent = (id: string) =>
  useQuery({
    queryKey: ['students', 'one', id],
    queryFn: () => api<StudentDetail>(`/students/${id}`),
  });

export const useClasses = (sessionId: string | undefined) =>
  useQuery({
    queryKey: ['classes', sessionId],
    queryFn: () => api<SchoolClass[]>(`/classes?sessionId=${sessionId}`),
    enabled: !!sessionId,
  });

export const useClass = (id: string) =>
  useQuery({
    queryKey: ['classes', 'one', id],
    queryFn: () => api<SchoolClass>(`/classes/${id}`),
  });

export const useClassStudents = (classId: string) =>
  useQuery({
    queryKey: ['classes', classId, 'students'],
    queryFn: () => api<ClassStudent[]>(`/classes/${classId}/students`),
  });

export const useClassSubjects = (classId: string) =>
  useQuery({
    queryKey: ['classes', classId, 'subjects'],
    queryFn: () => api<ClassSubject[]>(`/classes/${classId}/subjects`),
  });

export const useClassTimetable = (
  classId: string,
  termId: string | undefined,
) =>
  useQuery({
    queryKey: ['timetable', 'class', classId, termId],
    queryFn: () =>
      api<Lesson[]>(`/classes/${classId}/timetable?termId=${termId}`),
    enabled: !!termId,
  });

export const useFees = () =>
  useQuery({ queryKey: ['fees', 'all'], queryFn: () => api<Fee[]>('/fees') });

export const useMyFees = () =>
  useQuery({ queryKey: ['fees', 'me'], queryFn: () => api<Fee[]>('/fees/me') });

export const usePaymentAccount = () =>
  useQuery({
    queryKey: ['fees', 'account'],
    queryFn: () => api<PaymentAccount>('/fees/account'),
  });

/** A write, then refresh every query whose key starts with one of `invalidates`. */
export function useWrite<Input, Output = unknown>(
  write: (input: Input) => Promise<Output>,
  invalidates: string[][],
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: write,
    onSuccess: () =>
      Promise.all(
        invalidates.map((queryKey) =>
          queryClient.invalidateQueries({ queryKey }),
        ),
      ),
  });
}
