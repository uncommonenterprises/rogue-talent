import React, { useRef, useState } from 'react';
import { Form as FinalForm, Field } from 'react-final-form';
import arrayMutators from 'final-form-arrays';
import { FieldArray } from 'react-final-form-arrays';
import isEqual from 'lodash/isEqual';
import classNames from 'classnames';

// Import configs and util modules
import { FormattedMessage, useIntl } from '../../../../util/reactIntl';
import { isUploadImageOverLimitError } from '../../../../util/errors';

// Import shared components
import { Button, Form, AspectRatioWrapper } from '../../../../components';

// Import modules from parent directory
import { MIN_PORTFOLIO_PHOTOS, countUploadedImages } from '../portfolioRules';
import { WizardActions, wizardPrimaryButtonClassName } from '../WizardShell/WizardShell';

// Import modules from this directory
import ListingImage from './ListingImage';
import css from './EditListingPhotosForm.module.css';

const ACCEPT_IMAGES = 'image/*';

// Portfolio tiles use the portrait 4:5 shape of the talent card, so the model sees the crop
// clients will see (sign-up journey screen 10).
const TILE_ASPECT_WIDTH = 4;
const TILE_ASPECT_HEIGHT = 5;

const ImageUploadError = props => {
  return props.uploadOverLimit ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingPhotosForm.imageUploadFailed.uploadOverLimit" />
    </p>
  ) : props.uploadImageError ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingPhotosForm.imageUploadFailed.uploadFailed" />
    </p>
  ) : null;
};

const ShowListingsError = props => {
  return props.error ? (
    <p className={css.error}>
      <FormattedMessage id="EditListingPhotosForm.showListingFailed" />
    </p>
  ) : null;
};

const IconUpload = () => (
  <svg
    className={css.tileIcon}
    width="28"
    height="28"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d="M4 16.5V19a2 2 0 002 2h12a2 2 0 002-2v-2.5M7 9l5-5 5 5M12 4v13"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const IconAdd = () => (
  <svg
    className={css.tileIcon}
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const isImageFile = file => !file?.type || file.type.startsWith('image/');

/**
 * Field component that uses a file input to let the user pick images. Several files can be
 * chosen at once, or dragged onto the tile.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.formApi Final Form API ({ change, blur })
 * @param {Function} props.onImageUploadHandler called once per chosen file
 * @param {number} [props.aspectWidth] tile aspect ratio width
 * @param {number} [props.aspectHeight] tile aspect ratio height
 * @param {boolean} [props.isEmptyState] render the large "no photos yet" tile instead
 * @param {boolean} [props.multiple] allow choosing several files at once
 * @returns {JSX.Element}
 */
export const FieldAddImage = props => {
  const {
    formApi,
    onImageUploadHandler,
    aspectWidth = 1,
    aspectHeight = 1,
    isEmptyState = false,
    multiple = false,
    ...rest
  } = props;
  const [isDragActive, setIsDragActive] = useState(false);

  const handleFiles = fileList => {
    const files = Array.from(fileList || []).filter(isImageFile);
    if (files.length === 0) {
      return;
    }
    formApi.change(`addImage`, files[0]);
    formApi.blur(`addImage`);
    files.forEach(file => onImageUploadHandler(file));
  };

  return (
    <Field form={null} {...rest}>
      {fieldprops => {
        const { accept, input, label, disabled: fieldDisabled } = fieldprops;
        const { name, type } = input;
        const onChange = e => handleFiles(e.target.files);
        const inputProps = { accept, id: name, name, onChange, type, multiple };
        const dropProps = fieldDisabled
          ? {}
          : {
              onDragOver: e => {
                e.preventDefault();
                setIsDragActive(true);
              },
              onDragLeave: () => setIsDragActive(false),
              onDrop: e => {
                e.preventDefault();
                setIsDragActive(false);
                handleFiles(e.dataTransfer?.files);
              },
            };
        const labelClasses = classNames(css.addImage, {
          [css.addImageEmpty]: isEmptyState,
          [css.addImageDragActive]: isDragActive,
          [css.addImageDisabled]: fieldDisabled,
        });
        const labelElement = (
          <label htmlFor={name} className={labelClasses} {...dropProps}>
            {label}
          </label>
        );
        return (
          <div className={isEmptyState ? css.addImageWrapperEmpty : css.addImageWrapper}>
            {fieldDisabled ? null : <input {...inputProps} className={css.addImageInput} />}
            {isEmptyState ? (
              labelElement
            ) : (
              <AspectRatioWrapper width={aspectWidth} height={aspectHeight}>
                {labelElement}
              </AspectRatioWrapper>
            )}
          </div>
        );
      }}
    </Field>
  );
};

// Component that shows listing images from "images" field array
const FieldListingImage = props => {
  const { name, intl, onRemoveImage, aspectWidth, aspectHeight, variantPrefix } = props;
  return (
    <Field name={name}>
      {fieldProps => {
        const { input } = fieldProps;
        const image = input.value;
        return image ? (
          <ListingImage
            image={image}
            key={image?.id?.uuid || image?.id}
            className={css.thumbnail}
            savedImageAltText={intl.formatMessage({
              id: 'EditListingPhotosForm.savedImageAltText',
            })}
            onRemoveImage={() => onRemoveImage(image?.id)}
            aspectWidth={aspectWidth}
            aspectHeight={aspectHeight}
            variantPrefix={variantPrefix}
          />
        ) : null;
      }}
    </Field>
  );
};

// The portfolio needs MIN_PORTFOLIO_PHOTOS finished uploads before the step can be saved.
const minimumPhotos = message => images =>
  countUploadedImages(images) >= MIN_PORTFOLIO_PHOTOS ? undefined : message;

/**
 * The EditListingPhotosForm component ("Your portfolio", sign-up journey screen 10). With no
 * photos it shows one large upload tile; after that, a grid of photos (the first carries a
 * "Cover" badge, each has a remove button) ending in an "Add more" tile. At least 3 photos are
 * needed: until then the counter reads "X of 3 minimum" and Continue is disabled.
 *
 * @component
 * @param {Object} props
 * @param {string} [props.className] - Custom class that extends the default class for the root element
 * @param {string} [props.rootClassName] - Custom class that overrides the default class for the root element
 * @param {boolean} props.disabled - Whether the form is disabled
 * @param {boolean} props.ready - Whether the form is ready
 * @param {boolean} props.updated - Whether the form is updated
 * @param {boolean} props.updateInProgress - Whether the update is in progress
 * @param {Object} props.fetchErrors - The fetch errors object
 * @param {propTypes.error} props.fetchErrors.showListingsError - The show listings error
 * @param {propTypes.error} props.fetchErrors.uploadImageError - The upload image error
 * @param {propTypes.error} props.fetchErrors.updateListingError - The update listing error
 * @param {string} props.saveActionMsg - The save action message
 * @param {Object} [props.backLinkProps] - NamedLink props for the wizard's "Back" link
 * @param {Function} props.onSubmit - The submit function
 * @param {Function} props.onImageUpload - The image upload function
 * @param {Function} props.onRemoveImage - The remove image function
 * @param {Object} props.listingImageConfig - The listing image config
 * @param {string} props.listingImageConfig.variantPrefix - The variant prefix
 * @returns {JSX.Element}
 */
export const EditListingPhotosForm = props => {
  // Several photos can upload at once, so count the uploads still in flight.
  const [uploadsInProgress, setUploadsInProgress] = useState(0);
  const [submittedImages, setSubmittedImages] = useState([]);
  const uploadCounter = useRef(0);

  const onImageUploadHandler = file => {
    const { listingImageConfig, onImageUpload } = props;
    if (file) {
      uploadCounter.current += 1;
      setUploadsInProgress(n => n + 1);
      const done = () => setUploadsInProgress(n => Math.max(0, n - 1));

      onImageUpload(
        { id: `${file.name}_${Date.now()}_${uploadCounter.current}`, file },
        listingImageConfig
      )
        .then(done)
        .catch(done);
    }
  };
  const intl = useIntl();

  return (
    <FinalForm
      {...props}
      mutators={{ ...arrayMutators }}
      render={formRenderProps => {
        const {
          form,
          className,
          fetchErrors,
          handleSubmit,
          invalid,
          onRemoveImage,
          disabled,
          ready,
          saveActionMsg,
          backLinkProps,
          updated,
          updateInProgress,
          values,
          listingImageConfig,
        } = formRenderProps;

        const images = values.images || [];
        const { variantPrefix } = listingImageConfig;
        const isUploading = uploadsInProgress > 0;
        const uploadedCount = countUploadedImages(images);
        const belowMinimum = uploadedCount < MIN_PORTFOLIO_PHOTOS;

        const { showListingsError, updateListingError, uploadImageError } = fetchErrors || {};
        const uploadOverLimit = isUploadImageOverLimitError(uploadImageError);

        // imgs can contain added images (with temp ids) and submitted images with uniq ids.
        const arrayOfImgIds = imgs => imgs?.map(i => (typeof i.id === 'string' ? i.imageId : i.id));
        const imageIdsFromProps = arrayOfImgIds(images);
        const imageIdsFromPreviousSubmit = arrayOfImgIds(submittedImages);
        const imageArrayHasSameImages = isEqual(imageIdsFromProps, imageIdsFromPreviousSubmit);
        const submittedOnce = submittedImages.length > 0;
        const pristineSinceLastSubmit = submittedOnce && imageArrayHasSameImages;

        const submitReady = (updated && pristineSinceLastSubmit) || ready;
        const submitInProgress = updateInProgress;
        const submitDisabled =
          invalid || belowMinimum || disabled || submitInProgress || isUploading || ready;

        const classes = classNames(css.root, className);

        const addImageField = isEmptyState => (
          <FieldAddImage
            id="addImage"
            name="addImage"
            accept={ACCEPT_IMAGES}
            multiple
            isEmptyState={isEmptyState}
            label={
              <span className={css.chooseImageText}>
                {isEmptyState ? <IconUpload /> : <IconAdd />}
                <span className={css.chooseImage}>
                  <FormattedMessage
                    id={
                      isEmptyState
                        ? 'EditListingPhotosForm.chooseImage'
                        : 'EditListingPhotosForm.addMore'
                    }
                  />
                </span>
                {isEmptyState ? (
                  <span className={css.imageTypes}>
                    <FormattedMessage id="EditListingPhotosForm.imageTypes" />
                  </span>
                ) : null}
              </span>
            }
            type="file"
            disabled={isUploading}
            formApi={form}
            onImageUploadHandler={onImageUploadHandler}
            aspectWidth={TILE_ASPECT_WIDTH}
            aspectHeight={TILE_ASPECT_HEIGHT}
          />
        );

        return (
          <Form
            className={classes}
            onSubmit={e => {
              setSubmittedImages(images);
              handleSubmit(e);
            }}
          >
            {updateListingError ? (
              <p className={css.error}>
                <FormattedMessage id="EditListingPhotosForm.updateFailed" />
              </p>
            ) : null}

            <FieldArray
              name="images"
              validate={minimumPhotos(
                intl.formatMessage(
                  { id: 'EditListingPhotosForm.imageRequired' },
                  { minimum: MIN_PORTFOLIO_PHOTOS }
                )
              )}
            >
              {({ fields }) =>
                fields.length === 0 ? (
                  addImageField(true)
                ) : (
                  <ul className={css.imagesGrid}>
                    {fields.map((name, index) => (
                      <li key={name} className={css.photoTile}>
                        <FieldListingImage
                          name={name}
                          onRemoveImage={imageId => {
                            fields.remove(index);
                            onRemoveImage(imageId);
                          }}
                          intl={intl}
                          aspectWidth={TILE_ASPECT_WIDTH}
                          aspectHeight={TILE_ASPECT_HEIGHT}
                          variantPrefix={variantPrefix}
                        />
                        {index === 0 ? (
                          <span className={css.coverBadge}>
                            <FormattedMessage id="EditListingPhotosForm.coverBadge" />
                          </span>
                        ) : null}
                      </li>
                    ))}
                    <li className={css.addMoreTile}>{addImageField(false)}</li>
                  </ul>
                )
              }
            </FieldArray>

            <ImageUploadError
              uploadOverLimit={uploadOverLimit}
              uploadImageError={uploadImageError}
            />

            <p className={css.tip}>
              <FormattedMessage id="EditListingPhotosForm.addImagesTip" />
            </p>
            {belowMinimum ? (
              <p className={css.minimumHint}>
                <FormattedMessage
                  id="EditListingPhotosForm.minimumHint"
                  values={{ minimum: MIN_PORTFOLIO_PHOTOS }}
                />
              </p>
            ) : null}

            <ShowListingsError error={showListingsError} />

            <WizardActions
              backLinkProps={backLinkProps}
              aside={
                belowMinimum ? (
                  <FormattedMessage
                    id="EditListingPhotosForm.minimumCounter"
                    values={{ count: uploadedCount, minimum: MIN_PORTFOLIO_PHOTOS }}
                  />
                ) : null
              }
            >
              <Button
                className={wizardPrimaryButtonClassName}
                type="submit"
                inProgress={submitInProgress}
                disabled={submitDisabled}
                ready={submitReady}
              >
                {saveActionMsg}
              </Button>
            </WizardActions>
          </Form>
        );
      }}
    />
  );
};

export default EditListingPhotosForm;
