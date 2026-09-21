// Contracts (v1) — shared helpers for the single standard Rogue Talent
// Content Licence & Model Release.
//
// Direction (Neil, 2026-09-21): ONE standard, broad + perpetual licence applies
// to EVERY booking. There is NO per-booking usage selection (no duration /
// channels / territory choice). The licence text is the same for all bookings;
// only the Schedule (parties, dates, location, reference, fee) is auto-filled
// from the transaction.
//
// Formation (per docs/spikes/contracts-usage-rights.md): in-app clickwrap, NO
// third-party e-sign, NO transaction-process (EDN) change. The client accepts
// at checkout (a required checkbox that freezes `licenceAgreedByCustomer` +
// `licenceAgreementVersion` onto tx protectedData via the existing
// request-payment step). The model's existing Accept transition is the recorded
// provider agreement.
//
// ⚠️ LEGAL: all contract body copy is DRAFT — pending legal review. The source
// of the drafted wording is docs/legal/rogue-talent-content-licence-DRAFT.md; a
// qualified UK solicitor must finalise it before real users are onboarded
// (safety/legal flow — flagged for human review).

import { userDisplayNameAsString } from './data';
import { formatMoney } from './currency';

// Bump when the licence template changes, so bookings agreed under an older
// template can be distinguished. Frozen onto tx protectedData at checkout.
export const CONTRACT_VERSION = 'draft-2026-09-21';

// The single standard contract renders from en.json. These are the ordered
// message-id lists so the ContractPage + the checkout/transaction summaries stay
// in sync with the drafted document
// (docs/legal/rogue-talent-content-licence-DRAFT.md).

// Plain-English summary bullets (the "key terms" box in the draft).
export const CONTRACT_SUMMARY_POINT_IDS = [
  'Contract.summaryPoint1',
  'Contract.summaryPoint2',
  'Contract.summaryPoint3',
  'Contract.summaryPoint4',
  'Contract.summaryPoint5',
];

// The numbered, binding clauses (1–12 in the draft). Each has a heading + body
// message id.
export const CONTRACT_CLAUSE_IDS = [
  { heading: 'Contract.clause1Heading', body: 'Contract.clause1Body' },
  { heading: 'Contract.clause2Heading', body: 'Contract.clause2Body' },
  { heading: 'Contract.clause3Heading', body: 'Contract.clause3Body' },
  { heading: 'Contract.clause4Heading', body: 'Contract.clause4Body' },
  { heading: 'Contract.clause5Heading', body: 'Contract.clause5Body' },
  { heading: 'Contract.clause6Heading', body: 'Contract.clause6Body' },
  { heading: 'Contract.clause7Heading', body: 'Contract.clause7Body' },
  { heading: 'Contract.clause8Heading', body: 'Contract.clause8Body' },
  { heading: 'Contract.clause9Heading', body: 'Contract.clause9Body' },
  { heading: 'Contract.clause10Heading', body: 'Contract.clause10Body' },
  { heading: 'Contract.clause11Heading', body: 'Contract.clause11Body' },
  { heading: 'Contract.clause12Heading', body: 'Contract.clause12Body' },
];

/**
 * Build the per-booking "Schedule" rows for the standard contract, auto-filled
 * from a transaction. Same shape/data used on the ContractPage and in the
 * TransactionPage licence summary, so they stay consistent.
 *
 * Every value is guarded so an incomplete/legacy transaction (e.g. one created
 * before the shoot fields existed, or with the old usage_* protectedData)
 * renders gracefully — rows with no value are omitted.
 *
 * @param {Object} args
 * @param {Object} args.transaction denormalised transaction (with customer, provider, listing, booking)
 * @param {Object} args.intl react-intl instance (for date + label formatting)
 * @param {boolean} [args.omitFee] omit the Fee row (used on the TransactionPage,
 *   where the order breakdown already shows the price; the full ContractPage
 *   keeps it).
 * @returns {Array<{ key: string, label: string, value: string }>}
 */
export const getContractScheduleRows = ({ transaction, intl, omitFee = false } = {}) => {
  if (!transaction || !intl) {
    return [];
  }

  const customer = transaction.customer;
  const provider = transaction.provider;
  const booking = transaction.booking;
  const protectedData = transaction.attributes?.protectedData || {};

  const clientName = userDisplayNameAsString(customer, '');
  const clientCompany = customer?.attributes?.profile?.publicData?.company_name;
  const clientValue = clientCompany ? `${clientName} (${clientCompany})` : clientName;

  const modelName = userDisplayNameAsString(provider, '');

  const formatDateMaybe = date =>
    date ? intl.formatDate(date, { year: 'numeric', month: 'long', day: 'numeric' }) : null;
  const start = formatDateMaybe(booking?.attributes?.displayStart);
  const end = formatDateMaybe(booking?.attributes?.displayEnd);
  const shootDates =
    start && end && start !== end
      ? intl.formatMessage({ id: 'Contract.scheduleDateRange' }, { start, end })
      : start;

  const location = protectedData.customer_shoot_address;
  const reference = transaction.id?.uuid;

  const payinTotal = transaction.attributes?.payinTotal;
  const fee = payinTotal ? formatMoney(intl, payinTotal) : null;

  const label = id => intl.formatMessage({ id });

  const candidates = [
    { key: 'client', label: label('Contract.scheduleClient'), value: clientValue },
    { key: 'model', label: label('Contract.scheduleModel'), value: modelName },
    { key: 'dates', label: label('Contract.scheduleDates'), value: shootDates },
    { key: 'location', label: label('Contract.scheduleLocation'), value: location },
    { key: 'reference', label: label('Contract.scheduleReference'), value: reference },
    { key: 'fee', label: label('Contract.scheduleFee'), value: omitFee ? null : fee },
  ];

  return candidates.filter(row => row.value != null && row.value !== '');
};
