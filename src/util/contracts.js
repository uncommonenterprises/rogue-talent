// Contracts / image-usage-rights (v1) — shared helpers.
//
// The usage-rights taxonomy (enum options) is defined on the model-profile
// listing type's `transactionFields` in src/config/configListing.js. These
// helpers locate + format the frozen terms so the checkout capture, the
// TransactionPage licence block, and the ContractPage stay in sync.
//
// Design (per docs/spikes/contracts-usage-rights.md): in-app clickwrap, NO
// third-party e-sign, NO transaction-process (EDN) change. Capture rides on the
// existing `request-payment` step (which already runs update-protected-data);
// the model's existing Accept transition is the recorded provider agreement.
//
// ⚠️ LEGAL: all contract body copy is placeholder "DRAFT — pending legal
// review". A lawyer must supply the real licence/release wording before real
// users are onboarded (safety/legal flow — flagged for human review).

import { getPrefixedKey } from './fieldHelpers';

// Bump when the licence template / taxonomy changes, so bookings agreed under an
// older template can be distinguished. Frozen onto tx protectedData at checkout.
export const CONTRACT_VERSION = 'draft-2026-09-21';

// Usage-rights transaction field keys (customer-role). Kept in one place so the
// checkout capture, the TransactionPage licence block, and the ContractPage all
// reference the same set.
export const USAGE_RIGHTS_FIELD_KEYS = ['usage_duration', 'usage_channels', 'usage_territory'];

/**
 * Whether a transaction field key is one of the usage-rights fields. Used to
 * split the usage terms out of the generic transaction-fields display so they
 * can be shown in the dedicated "Image usage licence" block instead.
 *
 * @param {string} key transaction field key
 * @returns {boolean}
 */
export const isUsageRightsFieldKey = key => USAGE_RIGHTS_FIELD_KEYS.includes(key);

/**
 * Resolve the frozen usage-rights terms from a transaction's protectedData into
 * display rows. Usage fields are customer-role, so they are stored with the
 * `customer_` prefix (see getPrefixedKey / pickTransactionFieldsData).
 *
 * @param {Object} protectedData transaction protectedData
 * @param {Array} transactionFieldConfigs listing type transactionFields (for labels + enum options)
 * @returns {Array} rows: [{ key, label, value, values }]
 */
export const getUsageLicenceRows = (protectedData = {}, transactionFieldConfigs = []) => {
  return USAGE_RIGHTS_FIELD_KEYS.reduce((rows, key) => {
    const config = transactionFieldConfigs.find(f => f.key === key);
    if (!config) {
      return rows;
    }
    const prefixedKey = getPrefixedKey(config.showTo || 'customer', key);
    const raw = protectedData?.[prefixedKey];
    if (raw == null || (Array.isArray(raw) && raw.length === 0)) {
      return rows;
    }
    const optionLabel = option =>
      config.enumOptions?.find(o => `${o.option}` === `${option}`)?.label || option;
    const values = Array.isArray(raw) ? raw.map(optionLabel) : [optionLabel(raw)];
    return rows.concat({ key, label: config.label, value: values.join(', '), values });
  }, []);
};

/**
 * Whether a transaction has any frozen usage-rights terms on it.
 *
 * @param {Object} protectedData transaction protectedData
 * @param {Array} transactionFieldConfigs listing type transactionFields
 * @returns {boolean}
 */
export const hasUsageLicence = (protectedData = {}, transactionFieldConfigs = []) =>
  getUsageLicenceRows(protectedData, transactionFieldConfigs).length > 0;
