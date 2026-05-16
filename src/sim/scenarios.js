// Scenario fixtures + reset. The Phase 1 scenarios are:
//   - first_touch_new_customer: new email, deterministic customer/order
//   - returning_customer: existing email (Antigona) submits another inquiry
//
// All sim artifacts (sim_events, emails, tokens) carry scenarioId so reset
// can scope cleanup. The submitInquiry core action below decides which
// scenario applies based on the submitted email.
import store from '../core/store.js';
import * as SimEvents from './events.js';
import * as SimMail from './mail.js';
import * as SimTokens from './tokens.js';
import * as SimCheckout from './checkout.js';
import * as SimArtifacts from './artifacts.js';

const SCENARIO_FIRST_TOUCH = 'first_touch_new_customer';
const SCENARIO_RETURNING = 'returning_customer';

const FIRST_TOUCH = {
  scenarioId: SCENARIO_FIRST_TOUCH,
  customerId: 'demo-c-first-touch',
  customerName: 'Lena Hofmann',
  customerInitials: 'LH',
  email: 'demo.first-touch+9132@example.test',
  orderId: 9132,
};

const RETURNING = {
  scenarioId: SCENARIO_RETURNING,
  customerId: 'c-ab',
  email: 'antigona.berisha@example.com',
  orderId: 9133,
};

function nowIso() {
  return new Date().toISOString();
}

function tableRemoveIds(table, predicate) {
  const allIds = (table?.allIds || []).filter(id => !predicate(table.byId[id]));
  const byId = {};
  allIds.forEach(id => { byId[id] = table.byId[id]; });
  return { byId, allIds };
}

// Reset removes every dynamic resident and all sim-owned artifacts that
// accumulated during the session, returning the village to its seeded
// baseline. Seeded residents (origin: 'seeded') are never touched.
function resetScenarios() {
  SimEvents.clearForScenario(SCENARIO_FIRST_TOUCH);
  SimEvents.clearForScenario(SCENARIO_RETURNING);
  SimMail.clearForScenario(SCENARIO_FIRST_TOUCH);
  SimMail.clearForScenario(SCENARIO_RETURNING);
  SimTokens.clearForScenario(SCENARIO_FIRST_TOUCH);
  SimTokens.clearForScenario(SCENARIO_RETURNING);
  SimCheckout.clearForScenario(SCENARIO_FIRST_TOUCH);
  SimCheckout.clearForScenario(SCENARIO_RETURNING);
  SimArtifacts.clearForScenario(SCENARIO_FIRST_TOUCH);
  SimArtifacts.clearForScenario(SCENARIO_RETURNING);

  store.setState(prev => {
    const scenarios = [SCENARIO_FIRST_TOUCH, SCENARIO_RETURNING];
    // Remove dynamic-origin customers and scenario-tagged orders. Origin
    // is consulted ONLY here — never by business logic or sim subscribers.
    const customers = tableRemoveIds(prev.entities.customers, c => c?.origin === 'dynamic' || scenarios.includes(c?.scenarioId));
    const removedCustomerIds = new Set(
      (prev.entities.customers.allIds || []).filter(id => !customers.allIds.includes(id))
    );
    const orders = tableRemoveIds(prev.entities.orders, o => scenarios.includes(o?.scenarioId) || removedCustomerIds.has(o?.customerId));
    const removedOrderIds = new Set(
      (prev.entities.orders.allIds || []).filter(id => !orders.allIds.includes(id))
    );
    // Applications attached to removed scenario/dynamic orders must go too.
    const applications = tableRemoveIds(prev.entities.gw_applications || { byId: {}, allIds: [] }, a => scenarios.includes(a?.scenarioId) || removedOrderIds.has(a?.orderId));
    // If the active persona was a dynamic customer, fall back to the
    // seeded baseline (admin viewing) so the dropdown reflects reset state.
    const sessionWasDynamic = removedCustomerIds.has(prev.session.customerId);
    const session = sessionWasDynamic
      ? { ...prev.session, role: 'admin', customerId: 'c-ab' }
      : prev.session;
    return {
      ...prev,
      entities: { ...prev.entities, orders, customers, gw_applications: applications },
      session,
    };
  }, 'sim.scenario.reset');

  SimEvents.emit({
    source: 'platform',
    kind: 'demo.scenario.reset',
    detail: { scenarios: [SCENARIO_FIRST_TOUCH, SCENARIO_RETURNING] },
  });
}

function findCustomerByEmail(state, email) {
  const table = state.entities.customers;
  const target = (email || '').trim().toLowerCase();
  if (!target) return null;
  for (const id of table.allIds) {
    const c = table.byId[id];
    if ((c?.email || '').toLowerCase() === target) return c;
  }
  return null;
}

// Core domain action. Creates customer (if new) + order, then triggers
// simulation effects (admin notify, magic-link or welcome email, sim events).
function submitInquiry(input) {
  const email = (input.email || '').trim();
  const state = store.getState();
  const existing = findCustomerByEmail(state, email);

  let scenario;
  let customer;
  let orderId;
  let isNew;

  if (existing) {
    scenario = RETURNING;
    customer = existing;
    orderId = RETURNING.orderId;
    isNew = false;
  } else {
    scenario = FIRST_TOUCH;
    orderId = FIRST_TOUCH.orderId;
    customer = {
      id: FIRST_TOUCH.customerId,
      name: input.name || FIRST_TOUCH.customerName,
      initials: (input.name || FIRST_TOUCH.customerName).split(' ').map(s => s[0]).slice(0, 2).join('').toUpperCase() || FIRST_TOUCH.customerInitials,
      email,
      phone: input.phone || '',
      country: 'DE',
      leadSource: 'wp_form',
      orders: 1,
      ltv: 0,
      tags: ['new'],
      origin: 'dynamic',
      scenarioId: scenario.scenarioId,
      createdAt: nowIso(),
    };
    isNew = true;
  }

  const order = {
    id: orderId,
    status: 'qualified',
    customerId: customer.id,
    workType: input.workType || 'hausarbeit',
    title: input.subject || 'Hausarbeit (Anfrage)',
    field: input.field || '',
    pages: Number(input.pages) || null,
    finalDeadline: input.deadline ? `${input.deadline}T18:00:00` : null,
    customerNote: input.message || '',
    leadSource: 'wp_form',
    pipedriveStage: 'Inquiry',
    scenarioId: scenario.scenarioId,
    createdAt: nowIso(),
  };

  store.setState(prev => {
    const customers = isNew ? store.tableUpsert(prev.entities.customers, customer) : prev.entities.customers;
    const orders = store.tableUpsert(prev.entities.orders, order);
    return {
      ...prev,
      entities: { ...prev.entities, customers, orders },
    };
  }, `sim.intake.${scenario.scenarioId}`);

  SimEvents.emit({
    source: 'platform',
    kind: 'intake.received',
    orderId,
    customerId: customer.id,
    scenarioId: scenario.scenarioId,
    detail: { channel: 'f6378', email, subject: order.title, pages: order.pages, isNew },
  });
  SimEvents.emit({
    source: 'platform',
    kind: isNew ? 'customer.created' : 'customer.matched_existing',
    orderId,
    customerId: customer.id,
    scenarioId: scenario.scenarioId,
    detail: { name: customer.name, email: customer.email },
  });
  SimEvents.emit({
    source: 'platform',
    kind: 'order.created',
    orderId,
    customerId: customer.id,
    scenarioId: scenario.scenarioId,
    detail: { title: order.title, status: order.status },
  });

  const token = SimTokens.issue({
    customerId: customer.id,
    orderId,
    kind: isNew ? 'first_login' : 'returning_login',
    scenarioId: scenario.scenarioId,
  });
  SimEvents.emit({
    source: 'platform',
    kind: 'auth.token.issued',
    orderId,
    customerId: customer.id,
    scenarioId: scenario.scenarioId,
    detail: { tokenId: token.id, kind: token.kind, expiresAt: token.expiresAt },
  });

  SimMail.intakeAdminNotify({
    orderId,
    customerId: customer.id,
    customerName: customer.name,
    subject: order.title,
    pages: order.pages,
    scenarioId: scenario.scenarioId,
  });

  // Both new and existing customers receive a magic-link email. The visitor
  // must open the Demo Inbox to click it — no silent auto-login on submit.
  SimMail.magicLinkLogin({
    orderId,
    customerId: customer.id,
    customerEmail: customer.email,
    customerName: customer.name,
    tokenId: token.id,
    scenarioId: scenario.scenarioId,
  });

  return {
    isNew,
    customer,
    order,
    token,
    scenarioId: scenario.scenarioId,
  };
}

// Used by the new-email auto-redirect on /wp/vielen-dank.
function consumeFirstLoginAndAttach(tokenId) {
  const res = SimTokens.consume(tokenId);
  if (!res.ok) return res;
  const { token } = res;
  store.setState(prev => ({
    ...prev,
    session: { ...prev.session, role: 'customer', customerId: token.customerId },
  }), `sim.session.firstLogin:${token.customerId}`);
  SimEvents.emit({
    source: 'platform',
    kind: 'auth.token.consumed',
    orderId: token.orderId,
    customerId: token.customerId,
    scenarioId: token.scenarioId,
    detail: { tokenId, kind: token.kind },
  });
  return res;
}

export {
  SCENARIO_FIRST_TOUCH,
  SCENARIO_RETURNING,
  FIRST_TOUCH,
  RETURNING,
  resetScenarios,
  submitInquiry,
  consumeFirstLoginAndAttach,
  findCustomerByEmail,
};
