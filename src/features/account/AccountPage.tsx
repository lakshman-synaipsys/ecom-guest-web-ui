import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { phone as formatPhone } from '@/lib/format';
import { useAddresses, useMe, useMyOrders, useRename } from '@/lib/queries';
import { EmptyState } from '@/components/ui';

export function AccountPage() {
  const navigate = useNavigate();
  const { session, signedIn, signOut } = useAuth();
  const me = useMe();
  const rename = useRename();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const orders = useMyOrders();
  const addresses = useAddresses();

  if (!signedIn) {
    return (
      <EmptyState
        emoji="👋"
        title="Sign in to see your account"
        body="Your orders, your addresses, and reordering in one tap."
        action={<Link to="/signin" className="btn-primary">Sign in</Link>}
      />
    );
  }

  return (
    <div className="mx-auto max-w-lg">
      <div className="card p-5">
        {editing ? (
          <form
            className="flex gap-2"
            onSubmit={async (event) => {
              event.preventDefault();
              if (!draft.trim()) return;
              await rename.mutateAsync(draft.trim());
              setEditing(false);
            }}
          >
            <input
              className="input flex-1"
              autoFocus
              value={draft}
              placeholder="Your name"
              onChange={(event) => setDraft(event.target.value)}
            />
            <button className="btn-primary btn-sm" disabled={rename.isPending}>Save</button>
          </form>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate font-display text-xl font-semibold tracking-tight">
                {me.data?.needsName ? 'Welcome' : (me.data?.displayName ?? session?.displayName)}
              </p>
              <p className="mt-0.5 text-sm tabular text-ink-muted">
                {formatPhone(me.data?.phone ?? session?.phone)}
              </p>
            </div>
            <button
              className="text-xs font-semibold text-leaf"
              onClick={() => {
                setDraft(me.data?.needsName ? '' : (me.data?.displayName ?? ''));
                setEditing(true);
              }}
            >
              {me.data?.needsName ? 'Add name' : 'Edit'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Link to="/orders" className="card p-4 hover:shadow-lift">
          <p className="font-display text-2xl font-semibold tabular">
            {orders.data?.totalElements ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">orders so far</p>
        </Link>
        <Link to="/addresses" className="card p-4 hover:shadow-lift">
          <p className="font-display text-2xl font-semibold tabular">
            {addresses.data?.length ?? 0}
          </p>
          <p className="mt-0.5 text-xs text-ink-muted">saved addresses</p>
        </Link>
      </div>

      <div className="card mt-4 divide-y divide-line">
        <Link to="/orders" className="flex items-center justify-between px-4 py-3.5 hover:bg-sand">
          <span className="text-sm font-medium">Your orders</span>
          <span className="text-ink-faint">&rsaquo;</span>
        </Link>
        <Link to="/addresses" className="flex items-center justify-between px-4 py-3.5 hover:bg-sand">
          <span className="text-sm font-medium">Delivery addresses</span>
          <span className="text-ink-faint">&rsaquo;</span>
        </Link>
        <Link to="/cart" className="flex items-center justify-between px-4 py-3.5 hover:bg-sand">
          <span className="text-sm font-medium">Your basket</span>
          <span className="text-ink-faint">&rsaquo;</span>
        </Link>
      </div>

      <button
        className="btn-secondary btn-block mt-4"
        onClick={async () => {
          await signOut();
          navigate('/');
        }}
      >
        Sign out
      </button>
    </div>
  );
}
