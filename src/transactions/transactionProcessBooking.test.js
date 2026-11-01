import { createTransaction, createTxTransition } from '../util/testData';

import { TX_TRANSITION_ACTOR_CUSTOMER, getProcess } from './transaction';
import { isRefunded, isRelevantPastTransition } from './transactionProcessBooking';

describe('booking-v2 client graph: Q9 withdraw request', () => {
  const process = getProcess('default-booking');
  const { states, transitions } = process;

  const withdrawnTx = createTransaction({
    id: 'withdrawn-tx',
    processName: 'default-booking',
    lastTransition: transitions.CUSTOMER_WITHDRAW,
    transitions: [
      createTxTransition({
        createdAt: new Date(Date.UTC(2026, 10, 1, 16, 20)),
        by: TX_TRANSITION_ACTOR_CUSTOMER,
        transition: transitions.CONFIRM_PAYMENT,
      }),
      createTxTransition({
        createdAt: new Date(Date.UTC(2026, 10, 1, 17, 0)),
        by: TX_TRANSITION_ACTOR_CUSTOMER,
        transition: transitions.CUSTOMER_WITHDRAW,
      }),
    ],
  });

  it('withdraw goes from Requested (preauthorized) to withdrawn', () => {
    expect(transitions.CUSTOMER_WITHDRAW).toBe('transition/customer-withdraw');
    expect(process.graph.states[states.PREAUTHORIZED].on[transitions.CUSTOMER_WITHDRAW]).toBe(
      states.WITHDRAWN
    );
    expect(process.getState(withdrawnTx)).toBe('withdrawn');
  });

  it('withdrawn is an end state and the request had been made', () => {
    expect(process.graph.states[states.WITHDRAWN]).toEqual({});
    expect(process.hasPassedState(states.PREAUTHORIZED, withdrawnTx)).toBe(true);
    expect(process.hasPassedState(states.ACCEPTED, withdrawnTx)).toBe(false);
  });

  it('is shown in the activity feed and counts as a full release of the card hold', () => {
    expect(isRelevantPastTransition(transitions.CUSTOMER_WITHDRAW)).toBe(true);
    expect(isRefunded(transitions.CUSTOMER_WITHDRAW)).toBe(true);
  });

  it('only the client can withdraw, and only while Requested', () => {
    const fromStates = Object.entries(process.graph.states)
      .filter(([, s]) => s.on && s.on[transitions.CUSTOMER_WITHDRAW])
      .map(([name]) => name);
    expect(fromStates).toEqual([states.PREAUTHORIZED]);
  });
});
