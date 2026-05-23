import React, { useMemo } from 'react';
import * as D from '../../data.js';
import { Icon, Avatar, StatusPill, RegisteredContactBadge } from '../../utils.jsx';

function isRegisteredContact(contactType) {
  return contactType === 'customer' || contactType === 'gw';
}

const CONTACT_ROLE_LABELS = {
  customer: 'Registered customer',
  gw: 'Registered ghostwriter',
  lead: 'Lead (not registered)',
};

function namesDiffer(a, b) {
  return a && b && String(a).trim().toLowerCase() !== String(b).trim().toLowerCase();
}

function InboxContactInfoPanel({
  contact,
  entity,
  channelDisplayName = null,
  channelNameLabel = 'Channel name',
  orders = [],
  systemMode = false,
  systemContact = null,
  onClose,
  onOpenOrder,
}) {
  const sortedOrders = useMemo(
    () => [...orders].sort((a, b) => b.id - a.id),
    [orders],
  );

  if (systemMode && systemContact) {
    return (
      <aside className="inbox-contact-info-panel">
        <div className="inbox-contact-info-head">
          <span className="inbox-contact-info-title">Info</span>
          <button type="button" className="inbox-contact-info-close" onClick={onClose} aria-label="Close info panel">
            <Icon name="x" size={16}/>
          </button>
        </div>
        <div className="inbox-contact-info-body">
          <div className="inbox-contact-info-identity">
            <Avatar initials="SU" size={44} tone="slate"/>
            <div className="inbox-contact-info-identity-text">
              <strong>{systemContact.name}</strong>
              <span className="inbox-contact-info-role">System notification</span>
            </div>
          </div>
          <dl className="inbox-contact-info-fields">
            <dt>Name</dt>
            <dd>{systemContact.name}</dd>
            {systemContact.email && (
              <>
                <dt>Email</dt>
                <dd><a href={`mailto:${systemContact.email}`}>{systemContact.email}</a></dd>
              </>
            )}
          </dl>
        </div>
      </aside>
    );
  }

  const registered = isRegisteredContact(contact?.contactType);
  const registeredName = entity?.name || null;
  const channelName = channelDisplayName?.trim() || null;
  const headerName = (registered && namesDiffer(channelName, registeredName))
    ? channelName
    : (registeredName || channelName || contact?.name || contact?.phone || contact?.email || 'Contact');
  const ordersLabel = contact?.contactType === 'gw' ? 'Assignments' : 'Orders';

  return (
    <aside className="inbox-contact-info-panel">
      <div className="inbox-contact-info-head">
        <span className="inbox-contact-info-title">Info</span>
        <button type="button" className="inbox-contact-info-close" onClick={onClose} aria-label="Close info panel">
          <Icon name="x" size={16}/>
        </button>
      </div>

      <div className="inbox-contact-info-body">
        <div className="inbox-contact-info-identity">
          <Avatar
            initials={contact?.initials || '··'}
            size={44}
            tone={contact?.contactType === 'lead' ? 'amber' : contact?.contactType === 'gw' ? 'slate' : 'blue'}
          />
          <div className="inbox-contact-info-identity-text">
            <div className="inbox-contact-info-name-row">
              <strong>{headerName}</strong>
              <RegisteredContactBadge contactType={contact?.contactType} size={14}/>
            </div>
            <span className="inbox-contact-info-role">{CONTACT_ROLE_LABELS[contact?.contactType] || 'Contact'}</span>
          </div>
        </div>

        <dl className="inbox-contact-info-fields">
          {registered && registeredName && (
            <>
              <dt>Registered name</dt>
              <dd>{registeredName}</dd>
            </>
          )}
          {channelName && namesDiffer(channelName, registeredName) && (
            <>
              <dt>{channelNameLabel}</dt>
              <dd>{channelName}</dd>
            </>
          )}
          {contact?.email && (
            <>
              <dt>Email</dt>
              <dd><a href={`mailto:${contact.email}`}>{contact.email}</a></dd>
            </>
          )}
          {contact?.phone && (
            <>
              <dt>Phone</dt>
              <dd>{contact.phone}</dd>
            </>
          )}
          {entity?.country && contact?.contactType === 'customer' && (
            <>
              <dt>Country</dt>
              <dd>{entity.country}</dd>
            </>
          )}
          {registered && (
            <>
              <dt>{ordersLabel}</dt>
              <dd className="inbox-contact-info-order-count">{sortedOrders.length}</dd>
            </>
          )}
        </dl>

        {registered && (
          <div className="inbox-contact-info-orders">
            <div className="inbox-contact-info-orders-head">
              <strong>{ordersLabel}</strong>
              <span className="text-faint fs-11">{sortedOrders.length} total</span>
            </div>
            {sortedOrders.length > 0 && (
              <ul className="inbox-contact-info-order-list">
                {sortedOrders.map(o => (
                  <li key={o.id}>
                    <button
                      type="button"
                      className="inbox-contact-info-order-row"
                      onClick={() => onOpenOrder?.(o.id)}
                    >
                      <span className="inbox-contact-info-order-top">
                        <span className="mono inbox-contact-info-order-id">#{o.id}</span>
                        <StatusPill status={o.status} order={o}/>
                      </span>
                      <span className="inbox-contact-info-order-title">{o.title || 'Untitled'}</span>
                      <span className="inbox-contact-info-order-meta">
                        {D.WORK_TYPE_LABELS[o.workType] || o.workType}
                        {o.field ? ` · ${o.field}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}

export { InboxContactInfoPanel };
