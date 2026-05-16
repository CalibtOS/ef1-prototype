// GW · Calendar — monthly deadline view for this ghostwriter's assignments.

import React from 'react';
import { Icon } from '../../utils.jsx';
import { DeadlineCalendar } from '../shared/deadline-calendar.jsx';
import { ACTIVE_GW_ORDER_STATUSES } from '../core/selectors.js';
import * as EFHooks from '../core/hooks.js';
import EF from '../core/ef.js';

const ACTIVE_STATUS_SET = new Set(ACTIVE_GW_ORDER_STATUSES);

function GWCalendar({ navigate }) {
  const all = EFHooks.useOrders({ gwId: EF.GW_ME.id });
  const orders = all.filter(o => ACTIVE_STATUS_SET.has(o.status));

  return (
    <DeadlineCalendar
      orders={orders}
      navigate={navigate}
      pageTitle="Deadline Calendar"
      pageActions={
        <button className="btn btn-primary" onClick={() => navigate('gw-active')}>
          <Icon name="briefcase" size={14}/> My Assignments
        </button>
      }
    />
  );
}

export { GWCalendar };
