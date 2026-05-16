// Admin · Calendar — system-wide deadline view across all active orders.

import React from 'react';
import { Icon } from '../../utils.jsx';
import { DeadlineCalendar } from '../shared/deadline-calendar.jsx';
import * as EFHooks from '../core/hooks.js';

// Statuses that represent an order actively in delivery (has meaningful deadlines).
const IN_DELIVERY = new Set([
  'active', 'interim_submitted', 'under_customer_review', 'revision_required',
  'final_submitted', 'qa_review', 'delay_reported', 'extension_requested',
  'claimed_pending_approval', 'available', 'ai_violation_review',
]);

function AdminCalendar({ navigate }) {
  const all = EFHooks.useOrders();
  const orders = all.filter(o => IN_DELIVERY.has(o.status));

  return (
    <DeadlineCalendar
      orders={orders}
      navigate={navigate}
      pageTitle="Deadline Calendar"
      pageActions={
        <button className="btn btn-primary" onClick={() => navigate('orders')}>
          <Icon name="package" size={14}/> All Orders
        </button>
      }
    />
  );
}

export { AdminCalendar };
