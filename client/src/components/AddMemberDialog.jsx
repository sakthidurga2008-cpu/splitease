import { useState } from 'react';
import { useToast } from '../context/ToastContext.jsx';
import { api } from '../lib/api.js';
import PersonLookup from './PersonLookup.jsx';
import { Avatar, FormError, Modal } from './ui.jsx';

/** Add a registered user to an existing group. */
export default function AddMemberDialog({ group, members, onClose, onSaved }) {
  const toast = useToast();
  const [person, setPerson] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const add = async () => {
    setBusy(true);
    setError('');
    try {
      await api.post(`/groups/${group.group_id}/members`, { user_id: person.user_id });
      toast.success(`${person.user_name} added`);
      onSaved();
    } catch (problem) {
      setError(problem.message);
      setBusy(false);
    }
  };

  return (
    <Modal
      title="Add member"
      description={group.group_name}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="button button-quiet" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="button button-primary" disabled={!person || busy} onClick={add}>
            {busy ? 'Adding' : 'Add member'}
          </button>
        </>
      }
    >
      <FormError>{error}</FormError>
      <PersonLookup autoFocus exclude={members.map((member) => member.user_id)} onFound={setPerson} />
      {person ? (
        <div className="found">
          <Avatar id={person.user_id} name={person.user_name} />
          <div>
            <p className="row-title">{person.user_name}</p>
            <p className="row-sub">User ID {person.user_id}</p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
