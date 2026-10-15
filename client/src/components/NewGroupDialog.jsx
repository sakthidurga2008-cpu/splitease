import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import PersonLookup from './PersonLookup.jsx';
import { Avatar, Field, FormError, Modal } from './ui.jsx';

/** Create a group. Members can be added now or later from the group's page. */
export default function NewGroupDialog({ me, onClose, onCreated }) {
  const toast = useToast();
  const [name, setName] = useState('');
  const [people, setPeople] = useState([]);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setError(null), [name]);

  const submit = async (event) => {
    event.preventDefault();
    if (!name.trim()) return setError({ field: 'group_name', message: 'Enter a group name.' });
    setBusy(true);
    setError(null);
    try {
      const { group } = await api.post('/groups', {
        group_name: name,
        member_ids: people.map((person) => person.user_id),
      });
      toast.success('Group created');
      onCreated(group);
    } catch (problem) {
      setError(problem);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="New group"
      description="A group keeps one shared tab between its members."
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form="group-form" className="button button-primary" disabled={busy}>
            {busy ? 'Creating' : 'Create group'}
          </button>
        </>
      }
    >
      <form id="group-form" onSubmit={submit} noValidate>
        <FormError>{error && error.field !== 'group_name' ? error.message : null}</FormError>

        <Field label="Group name" error={error?.field === 'group_name' ? error.message : null}>
          {(props) => (
            <input
              {...props}
              type="text"
              maxLength={100}
              autoFocus
              placeholder="Goa trip, Flat 4B, Final year project"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          )}
        </Field>

        <PersonLookup
          exclude={[me.user_id, ...people.map((person) => person.user_id)]}
          onFound={(person) => setPeople((current) => [...current, person])}
        />

        <ul className="people-chips" aria-label="Members">
          <li>
            <Avatar id={me.user_id} name={me.user_name} size="s" />
            You
          </li>
          {people.map((person) => (
            <li key={person.user_id}>
              <Avatar id={person.user_id} name={person.user_name} size="s" />
              {person.user_name}
              <button
                type="button"
                className="icon-button icon-button-small"
                aria-label={`Remove ${person.user_name}`}
                onClick={() => setPeople((current) => current.filter((p) => p.user_id !== person.user_id))}
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      </form>
    </Modal>
  );
}
