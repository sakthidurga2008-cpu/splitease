import { useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../lib/api.js';

/**
 * Finds a registered user by their exact user ID, phone number or email.
 * Calls onFound({ user_id, user_name }) with the match.
 */
export default function PersonLookup({ onFound, exclude = [], autoFocus = false }) {
  const [term, setTerm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const search = async () => {
    const value = term.trim();
    if (!value) return setError('Enter a user ID, phone number or email.');
    setBusy(true);
    setError('');
    try {
      const { user } = await api.get(`/users/lookup?q=${encodeURIComponent(value)}`);
      if (exclude.includes(user.user_id)) {
        setError(`${user.user_name} is already in the group.`);
      } else {
        onFound(user);
        setTerm('');
      }
    } catch (problem) {
      setError(problem.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`field ${error ? 'field-invalid' : ''}`}>
      <label htmlFor="person-lookup">Add someone</label>
      <div className="lookup">
        <input
          id="person-lookup"
          type="text"
          placeholder="User ID, phone number or email"
          autoFocus={autoFocus}
          value={term}
          onChange={(event) => setTerm(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              search();
            }
          }}
        />
        <button type="button" className="button button-quiet" onClick={search} disabled={busy}>
          <Search size={16} aria-hidden />
          Find
        </button>
      </div>
      {error ? (
        <p className="field-error" role="alert">
          {error}
        </p>
      ) : (
        <p className="field-hint">They need a SplitEase account first.</p>
      )}
    </div>
  );
}
