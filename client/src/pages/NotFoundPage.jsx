import { Link } from 'react-router-dom';
import { EmptyState } from '../components/ui.jsx';
import { usePageTitle } from '../lib/usePageTitle.js';

export default function NotFoundPage() {
  usePageTitle('Page not found');
  return (
    <section className="panel">
      <EmptyState
        title="This page does not exist"
        action={
          <Link to="/" className="button button-primary">
            Go to overview
          </Link>
        }
      >
        The address may be mistyped, or the page may have moved.
      </EmptyState>
    </section>
  );
}
