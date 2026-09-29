import React from 'react';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';

// Import shared components
import { NamedLink } from '../../../../components';

// Import modules from this directory
import css from './WizardShell.module.css';

// Step states for the stepper (sign-up journey mockups 08 to 13).
export const STEP_DONE = 'done';
export const STEP_CURRENT = 'current';
export const STEP_TODO = 'todo';

const IconStepDone = () => (
  <svg
    className={css.stepTick}
    width="12"
    height="12"
    viewBox="0 0 12 12"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M2 6l2.5 2.5L10 3"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * Top bar of the model onboarding wizard: the "Rogue." brand and a "Save & exit" link. Steps
 * are saved as the model presses Continue, so exiting keeps everything up to the last step.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.exitLinkProps NamedLink props ({ name, params }) for "Save & exit"
 * @returns {JSX.Element}
 */
export const WizardTopbar = props => {
  const { exitLinkProps } = props;
  const intl = useIntl();
  return (
    <nav
      className={css.topbar}
      aria-label={intl.formatMessage({ id: 'EditListingWizard.shell.navLabel' })}
    >
      <NamedLink name="LandingPage" className={css.brand}>
        <FormattedMessage id="EditListingWizard.shell.brand" />
        <span className={css.brandDot}>.</span>
      </NamedLink>
      <NamedLink {...exitLinkProps} className={css.exitLink}>
        <FormattedMessage id="EditListingWizard.shell.saveAndExit" />
      </NamedLink>
    </nav>
  );
};

/**
 * @typedef {Object} WizardStep
 * @property {string} tab the wizard tab
 * @property {string} label the step label
 * @property {'done'|'current'|'todo'} status
 * @property {Object?} linkProps NamedLink props when the step can be revisited, else null
 */

/**
 * Progress through the onboarding steps. From 760px up it's a 4-step stepper with labels
 * (done / current / to-do); below that it's a compact "Step X of 4 - Name" progress bar.
 * On the review step (`isComplete`) every step reads as done.
 *
 * @component
 * @param {Object} props
 * @param {Array<WizardStep>} props.steps the steps in order (the review step is not one)
 * @param {boolean} [props.isComplete] true on the review step
 * @returns {JSX.Element}
 */
export const WizardStepper = props => {
  const { steps, isComplete = false } = props;
  const intl = useIntl();
  const total = steps.length;
  const currentIndex = steps.findIndex(s => s.status === STEP_CURRENT);
  const currentStep = currentIndex >= 0 ? steps[currentIndex] : null;
  const progress = isComplete || !currentStep ? 100 : ((currentIndex + 1) / total) * 100;

  const mobileLabel =
    isComplete || !currentStep
      ? intl.formatMessage({ id: 'EditListingWizard.shell.stepsComplete' }, { total })
      : intl.formatMessage(
          { id: 'EditListingWizard.shell.stepOf' },
          { current: currentIndex + 1, total, name: currentStep.label }
        );

  return (
    <div className={css.stepperRoot}>
      <div className={css.stepperMobile}>
        <span className={css.stepperMobileLabel}>{mobileLabel}</span>
        <div
          className={css.stepperBar}
          role="progressbar"
          aria-label={mobileLabel}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span className={css.stepperBarFill} style={{ width: `${progress}%` }} />
        </div>
      </div>

      <ol
        className={css.stepper}
        aria-label={intl.formatMessage({ id: 'EditListingWizard.shell.stepsLabel' })}
      >
        {steps.map((step, i) => {
          const isDone = step.status === STEP_DONE;
          const isCurrent = step.status === STEP_CURRENT;
          const itemClasses = classNames(css.step, {
            [css.stepDone]: isDone,
            [css.stepCurrent]: isCurrent,
          });
          const content = (
            <>
              <span className={css.stepDot}>{isDone ? <IconStepDone /> : i + 1}</span>
              <span className={css.stepLabel}>{step.label}</span>
              {isDone ? (
                <span className={css.srOnly}>
                  <FormattedMessage id="EditListingWizard.shell.stepDone" />
                </span>
              ) : null}
            </>
          );
          return (
            <li
              key={step.tab}
              className={itemClasses}
              aria-current={isCurrent ? 'step' : undefined}
            >
              {step.linkProps && !isCurrent ? (
                <NamedLink {...step.linkProps} className={css.stepLink}>
                  {content}
                </NamedLink>
              ) : (
                <span className={css.stepLink}>{content}</span>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

/**
 * Heading block of a wizard step: Bricolage title and the step's guidance line.
 *
 * @component
 * @param {Object} props
 * @param {ReactNode} props.title the h1 content
 * @param {ReactNode} [props.guidance] the guidance paragraph
 * @returns {JSX.Element}
 */
export const WizardPanelHeader = props => {
  const { title, guidance } = props;
  return (
    <div className={css.panelHeader}>
      <h1 className={css.panelTitle}>{title}</h1>
      {guidance ? <p className={css.panelGuidance}>{guidance}</p> : null}
    </div>
  );
};

/**
 * The action bar at the foot of a wizard step: "Back" (secondary, a link to the previous
 * step) on the left and the step's primary action on the right. It wraps onto two lines if a
 * narrow phone runs out of room. Without a back link, the left slot stays empty.
 *
 * @component
 * @param {Object} props
 * @param {Object} [props.backLinkProps] NamedLink props ({ name, params }) for "Back"
 * @param {ReactNode} [props.aside] extra content next to the primary action (e.g. a counter)
 * @param {ReactNode} props.children the primary action (the submit button)
 * @returns {JSX.Element}
 */
export const WizardActions = props => {
  const { backLinkProps, aside, children } = props;
  return (
    <div className={css.actions}>
      {backLinkProps ? (
        <NamedLink {...backLinkProps} className={css.backLink}>
          <FormattedMessage id="EditListingWizard.shell.back" />
        </NamedLink>
      ) : (
        <span />
      )}
      <div className={css.primaryGroup}>
        {aside ? <span className={css.aside}>{aside}</span> : null}
        {children}
      </div>
    </div>
  );
};

/**
 * Class name for the primary (submit) button inside WizardActions: auto width, large size.
 */
export const wizardPrimaryButtonClassName = css.primaryButton;
