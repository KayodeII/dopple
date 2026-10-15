import { Link } from 'react-router';
import { Empty, PageHeader } from '../components/ui';

export function NotFound() {
  return (
    <>
      <PageHeader title="Page not found" />
      <Empty>
        There is nothing at this address.{' '}
        <Link to="/" className="underline">
          Go home
        </Link>
      </Empty>
    </>
  );
}

/** For pages a role cannot use, e.g. a student opening /students. */
export function StaffOnly() {
  return (
    <>
      <PageHeader title="Staff only" />
      <Empty>
        This page is for teachers and admins.{' '}
        <Link to="/" className="underline">
          Go home
        </Link>
      </Empty>
    </>
  );
}
