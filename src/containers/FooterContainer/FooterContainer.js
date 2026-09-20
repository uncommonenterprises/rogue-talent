import React from 'react';
import { useConfiguration } from '../../context/configurationContext';
import loadable from '@loadable/component';

import { FormattedMessage } from '../../util/reactIntl';
import { NamedLink } from '../../components';

import css from './FooterContainer.module.css';

const SectionBuilder = loadable(
  () => import(/* webpackChunkName: "SectionBuilder" */ '../PageBuilder/PageBuilder'),
  {
    resolveComponent: components => components.SectionBuilder,
  }
);

// SAF-29: an always-available "Report a safety concern" link. The main footer is
// hosted (Console) content, so this discreet repo-controlled row is appended
// beneath it to guarantee the reporting route is reachable from every page.
const SafetyReportRow = () => (
  <div className={css.safetyRow}>
    <NamedLink name="SafetyReportPage" className={css.safetyLink}>
      <FormattedMessage id="Footer.reportSafetyConcern" />
    </NamedLink>
  </div>
);

const FooterComponent = () => {
  const { footer = {}, topbar } = useConfiguration();

  // If footer asset is not set, let's not render Footer at all.
  if (Object.keys(footer).length === 0) {
    return <SafetyReportRow />;
  }

  // The footer asset does not specify sectionId or sectionType. However, the SectionBuilder
  // expects sectionId and sectionType in order to identify the section. We add those
  // attributes here before passing the asset to SectionBuilder.
  const footerSection = {
    ...footer,
    sectionId: 'footer',
    sectionType: 'footer',
    linkLogoToExternalSite: topbar?.logoLink,
  };

  return (
    <>
      <SectionBuilder sections={[footerSection]} />
      <SafetyReportRow />
    </>
  );
};

// NOTE: if you want to add dynamic data to FooterComponent,
//       you could just connect this FooterContainer to Redux Store
//
// const mapStateToProps = state => {
//   const { currentUser } = state.user;
//   return { currentUser };
// };
// const FooterContainer = compose(connect(mapStateToProps))(FooterComponent);
// export default FooterContainer;

export default FooterComponent;
