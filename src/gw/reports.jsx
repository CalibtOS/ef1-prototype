// GW · My Reports — read-only view of chat reports submitted by this GW.
import React from 'react';
import { CrumbBar } from '../../shell.jsx';
import { MyReportsView } from '../components/MyReportsView.jsx';
import * as EFHooks from '../core/hooks.js';

function GWReports() {
  const { gwId } = EFHooks.useCurrentRole();
  return (
    <div className="page">
      <div className="page-header">
        <div>
          <CrumbBar trail={['My Dashboard', 'My Reports']}/>
          <h1 className="page-title" style={{ marginTop: 6 }}>My Reports</h1>
          <div className="page-subtitle">
            Chat reports you have submitted · review status and admin feedback
          </div>
        </div>
      </div>
      <MyReportsView lang="en" userId={gwId} reporterRole="gw"/>
    </div>
  );
}

export { GWReports };
