import React from 'react';
import { compose } from 'redux';
import { connect } from 'react-redux';

import { useConfiguration } from '../../context/configurationContext';
import { FormattedMessage, useIntl } from '../../util/reactIntl';
import { propTypes } from '../../util/types';
import { PROFILE_PAGE_PENDING_APPROVAL_VARIANT } from '../../util/urlHelpers';
import { ensureCurrentUser } from '../../util/data';
import {
  initialValuesForUserFields,
  isUserAuthorized,
  pickUserFieldsData,
  showCreateListingLinkForUser,
} from '../../util/userHelpers';
import { showProfileSettingsForUser } from '../../util/settingsPages';
import { isScrollingDisabled } from '../../ducks/ui.duck';

import {
  AccountStatusBadge,
  H3,
  Page,
  UserNav,
  NamedLink,
  NamedRedirect,
  LayoutSingleColumn,
} from '../../components';

import {
  getAccountStatus,
  isAccountStatusFlowEnabled,
  isModelUser,
} from '../../util/accountStatus';

import TopbarContainer from '../../containers/TopbarContainer/TopbarContainer';
import FooterContainer from '../../containers/FooterContainer/FooterContainer';

import ProfileSettingsForm from './ProfileSettingsForm/ProfileSettingsForm';

import { updateProfile, uploadImage } from './ProfileSettingsPage.duck';
import css from './ProfileSettingsPage.module.css';

const onImageUploadHandler = (values, fn) => {
  const { id, imageId, file } = values;
  if (file) {
    fn({ id, imageId, file });
  }
};

const ViewProfileLink = props => {
  const { userUUID, isUnauthorizedUser } = props;
  return userUUID && isUnauthorizedUser ? (
    <NamedLink
      className={css.profileLink}
      name="ProfilePageVariant"
      params={{ id: userUUID, variant: PROFILE_PAGE_PENDING_APPROVAL_VARIANT }}
    >
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  ) : userUUID ? (
    <NamedLink className={css.profileLink} name="ProfilePage" params={{ id: userUUID }}>
      <FormattedMessage id="ProfileSettingsPage.viewProfileLink" />
    </NamedLink>
  ) : null;
};

/**
 * ProfileSettingsPage (clients). Models don't have this page (tester feedback F5, part C): their
 * profile is the "Your profile" wizard, their name is on Account settings > Contact details and
 * their private-residence boundary on Account settings > Safety. A model reaching this page (an
 * old link or bookmark) is redirected to Contact details.
 *
 * @component
 * @param {Object} props
 * @param {propTypes.currentUser} props.currentUser - The current user
 * @param {Object} props.image - The image
 * @param {string} props.image.id - The image id
 * @param {propTypes.uuid} props.image.imageId - The image id
 * @param {File} props.image.file - The image file
 * @param {propTypes.image} props.image.uploadedImage - The uploaded image
 * @param {Function} props.onImageUpload - The image upload function
 * @param {Function} props.onUpdateProfile - The update profile function
 * @param {propTypes.ownListing} [props.ownListing] - The user's own model-profile listing
 *   (loaded by loadData) — supplies the account-status Gate-A submission signal
 * @param {boolean} props.scrollingDisabled - Whether the scrolling is disabled
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {propTypes.error} props.updateProfileError - The update profile error
 * @param {propTypes.error} props.uploadImageError - The upload image error
 * @param {boolean} props.uploadInProgress - Whether the upload is in progress
 * @returns {JSX.Element}
 */
export const ProfileSettingsPageComponent = props => {
  const config = useConfiguration();
  const intl = useIntl();
  const {
    currentUser,
    image,
    onImageUpload,
    onUpdateProfile,
    ownListing,
    scrollingDisabled,
    updateInProgress,
    updateProfileError,
    uploadImageError,
    uploadInProgress,
  } = props;

  const { userFields, userTypes = [] } = config.user;
  const publicUserFields = userFields.filter(uf => uf.scope === 'public');

  const handleSubmit = (values, userType) => {
    const { firstName, lastName, displayName, bio: rawBio, ...rest } = values;

    const displayNameMaybe = displayName
      ? { displayName: displayName.trim() }
      : { displayName: null };

    // Ensure that the optional bio is a string
    const bio = rawBio || '';

    // The SAF-13 private-residence boundary is saved on Account settings > Safety (models only,
    // see SafetySettingsPage), never from here.
    const profile = {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...displayNameMaybe,
      bio,
      publicData: {
        ...pickUserFieldsData(rest, 'public', userType, userFields),
      },
    };
    const uploadedImage = props.image;

    // Update profileImage only if file system has been accessed
    const updatedValues =
      uploadedImage && uploadedImage.imageId && uploadedImage.file
        ? { ...profile, profileImageId: uploadedImage.imageId }
        : profile;

    onUpdateProfile(updatedValues);
  };

  const user = ensureCurrentUser(currentUser);
  const { firstName, lastName, displayName, bio, publicData } = user?.attributes.profile;
  // I.e. the status is active, not pending-approval or banned
  const isUnauthorizedUser = currentUser && !isUserAuthorized(currentUser);

  const { userType } = publicData || {};
  const profileImageId = user.profileImage ? user.profileImage.id : null;
  const profileImage = image || { imageId: profileImageId };
  const userTypeConfig = userTypes.find(config => config.userType === userType);
  const isDisplayNameIncluded = userTypeConfig?.defaultUserFields?.displayName !== false;
  // ProfileSettingsForm decides if it's allowed to show the input field.
  const displayNameMaybe = isDisplayNameIncluded && displayName ? { displayName } : {};

  const profileSettingsForm = user.id ? (
    <ProfileSettingsForm
      className={css.form}
      currentUser={currentUser}
      initialValues={{
        firstName,
        lastName,
        ...displayNameMaybe,
        bio,
        profileImage: user.profileImage,
        ...initialValuesForUserFields(publicData, 'public', userType, userFields),
      }}
      profileImage={profileImage}
      onImageUpload={e => onImageUploadHandler(e, onImageUpload)}
      uploadInProgress={uploadInProgress}
      updateInProgress={updateInProgress}
      uploadImageError={uploadImageError}
      updateProfileError={updateProfileError}
      onSubmit={values => handleSubmit(values, userType)}
      marketplaceName={config.marketplaceName}
      userFields={publicUserFields}
      userTypeConfig={userTypeConfig}
    />
  ) : null;

  const title = intl.formatMessage({ id: 'ProfileSettingsPage.title' });

  const showManageListingsLink = showCreateListingLinkForUser(config, currentUser);

  // Account-status lifecycle badge (self-view only). Gate B (verified) is derived from the
  // Stripe account denormalised onto currentUser (models) or the identity_verified metadata
  // (clients). The model "submitted" (Gate A) signal comes from the user's own model-profile
  // listing, loaded by this page's loadData and threaded in as `ownListing` — so a
  // submitted-but-not-yet-approved model now reads as "Pending approval", not "Draft".
  // See util/accountStatus.js.
  const accountStatus = currentUser?.id
    ? getAccountStatus({ currentUser, ownListing })
    : null;

  // Models have no Profile settings page: send old links and bookmarks to Contact details (where
  // their name now lives). On a full page load this is a server-side redirect.
  if (isModelUser(currentUser)) {
    return <NamedRedirect name="ContactDetailsPage" />;
  }

  return (
    <Page className={css.root} title={title} scrollingDisabled={scrollingDisabled}>
      <LayoutSingleColumn
        topbar={
          <>
            <TopbarContainer />
            <UserNav
              currentPage="ProfileSettingsPage"
              showManageListingsLink={showManageListingsLink}
              showProfileSettingsLink={showProfileSettingsForUser(currentUser)}
            />
          </>
        }
        footer={<FooterContainer />}
      >
        <div className={css.content}>
          {accountStatus ? (
            <div className={css.statusRow}>
              {/* With the account-status lifecycle on, the badge links to the status page. */}
              {isAccountStatusFlowEnabled() ? (
                <NamedLink name="AccountStatusPage" className={css.statusLink}>
                  <AccountStatusBadge status={accountStatus} large />
                </NamedLink>
              ) : (
                <AccountStatusBadge status={accountStatus} large />
              )}
            </div>
          ) : null}
          <div className={css.headingContainer}>
            <H3 as="h1" className={css.heading}>
              <FormattedMessage id="ProfileSettingsPage.heading" />
            </H3>

            <ViewProfileLink userUUID={user?.id?.uuid} isUnauthorizedUser={isUnauthorizedUser} />
          </div>
          {profileSettingsForm}
        </div>
      </LayoutSingleColumn>
    </Page>
  );
};

const mapStateToProps = state => {
  const { currentUser } = state.user;
  const {
    image,
    uploadImageError,
    uploadInProgress,
    updateInProgress,
    updateProfileError,
    ownListing,
  } = state.ProfileSettingsPage;
  return {
    currentUser,
    image,
    ownListing,
    scrollingDisabled: isScrollingDisabled(state),
    updateInProgress,
    updateProfileError,
    uploadImageError,
    uploadInProgress,
  };
};

const mapDispatchToProps = dispatch => ({
  onImageUpload: data => dispatch(uploadImage(data)),
  onUpdateProfile: data => dispatch(updateProfile(data)),
});

const ProfileSettingsPage = compose(
  connect(
    mapStateToProps,
    mapDispatchToProps
  )
)(ProfileSettingsPageComponent);

export default ProfileSettingsPage;
