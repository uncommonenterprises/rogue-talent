import React from 'react';

import { intlShape } from '../../util/reactIntl';
import { requiredFieldArrayCheckbox } from '../../util/validators';

import { FieldCheckboxGroup } from '../../components';

// The submit handlers turn a ticked box into protectedData.ageConfirmed18Plus (+ a timestamp).
import { AGE_CONFIRMATION_FIELD, AGE_CONFIRMATION_OPTION } from './AuthenticationPage.helpers';

import css from './FieldAgeConfirmation.module.css';

/**
 * Required "I confirm I'm 18 or over" tick box for sign-up (RT-FB-03, SAF-38). Separate from the
 * terms tick box so each has its own validation message. It is self-declared: the real 18+ gate
 * is the ID-verified check at Stripe verification.
 *
 * @component
 * @param {Object} props
 * @param {string?} props.formId form id used to build the input id
 * @param {intlShape} props.intl
 * @returns {JSX.Element}
 */
const FieldAgeConfirmation = props => {
  const { formId, intl } = props;
  return (
    <FieldCheckboxGroup
      rootClassName={css.root}
      name={AGE_CONFIRMATION_FIELD}
      id={formId ? `${formId}.${AGE_CONFIRMATION_FIELD}` : AGE_CONFIRMATION_FIELD}
      optionLabelClassName={css.label}
      options={[
        {
          key: AGE_CONFIRMATION_OPTION,
          label: intl.formatMessage({ id: 'AuthenticationPage.ageConfirmationLabel' }),
        },
      ]}
      validate={requiredFieldArrayCheckbox(
        intl.formatMessage({ id: 'AuthenticationPage.ageConfirmationRequired' })
      )}
    />
  );
};

export default FieldAgeConfirmation;
