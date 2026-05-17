// Admin · Calendar — system-wide deadline view across all active orders.

import React from 'react';
import { Icon } from '../../utils.jsx';
import { DeadlineCalendar } from '../shared/deadline-calendar.jsx';
import { IN_DELIVERY_STATUSES } from '../core/selectors.js';
import * as EFHooks from '../core/hooks.js';

const IN_DELIVERY = new Set(IN_DELIVERY_STATUSES);

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
