import React, { useEffect, useRef, useState } from 'react';
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
import { MIN_PORTFOLIO_PHOTOS, countUploadedImages, isUploadedImage } from '../portfolioRules';
import { getImageKey, moveItem } from '../portfolioOrder';
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
 * @param {boolean} [props.ignoreDrags] a portfolio photo is being dragged to a new position,
 *   so the tile doesn't act as a drop zone
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
    ignoreDrags = false,
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
        const dropProps =
          fieldDisabled || ignoreDrags
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

const IconChevron = props => (
  <svg
    className={css.orderIcon}
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    aria-hidden="true"
    focusable="false"
  >
    <path
      d={props.direction === 'left' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

// Controls inside a tile, in the order focus falls back to after the photo has moved.
const ACTION_LATER = 'later';
const ACTION_EARLIER = 'earlier';
const ACTION_COVER = 'cover';
const FOCUS_FALLBACK = [ACTION_LATER, ACTION_EARLIER, ACTION_COVER];

/**
 * The portfolio grid (tester feedback F5): each finished photo can be made the cover, moved
 * one place earlier or later with buttons, or dragged onto another photo's place. The first
 * photo is the cover. The new order goes to the form (fields.move) and to the page state
 * (onReorderImages), and is saved by the normal photos save.
 *
 * After a move, focus follows the photo that moved, and a polite live region says where it
 * went, so keyboard and screen reader users keep their place.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.fields Final Form FieldArray fields for "images"
 * @param {Array<Object>} props.images the form's images, in order
 * @param {Function} props.onRemoveImage remove handler, called with the image id
 * @param {Function} [props.onReorderImages] called with the new order (array of image keys)
 * @param {boolean} props.disabled no reordering (e.g. while saving)
 * @param {Function} props.renderAddMore renders the "Add more" tile; gets `isReordering`
 * @param {number} props.aspectWidth tile aspect ratio width
 * @param {number} props.aspectHeight tile aspect ratio height
 * @param {string} props.variantPrefix listing image variant prefix
 * @returns {JSX.Element}
 */
const PortfolioGrid = props => {
  const {
    fields,
    images,
    onRemoveImage,
    onReorderImages,
    disabled,
    renderAddMore,
    aspectWidth,
    aspectHeight,
    variantPrefix,
  } = props;
  const intl = useIntl();
  const [dragIndex, setDragIndex] = useState(null);
  const [overIndex, setOverIndex] = useState(null);
  const [pendingFocus, setPendingFocus] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const tileRefs = useRef({});

  const keys = images.map(getImageKey);
  const count = images.length;
  const orderSignature = keys.join('|');

  // Move focus to the photo that just moved (the order arrives from the page state, so wait
  // for the render that shows it). DOM focus only, no data loading.
  useEffect(() => {
    if (!pendingFocus) {
      return;
    }
    const tile = tileRefs.current[pendingFocus.key];
    if (tile) {
      const actions = [pendingFocus.action, ...FOCUS_FALLBACK];
      const target = actions
        .map(action => tile.querySelector(`[data-photo-action="${action}"]:not([disabled])`))
        .find(Boolean);
      if (target) {
        target.focus();
      }
    }
    setPendingFocus(null);
  }, [pendingFocus, orderSignature]);

  const canMove = index => !disabled && count > 1 && isUploadedImage(images[index]);

  const reorder = (fromIndex, toIndex, focusAction) => {
    const isValid = toIndex >= 0 && toIndex < count && fromIndex !== toIndex;
    if (!isValid || !canMove(fromIndex)) {
      return;
    }
    fields.move(fromIndex, toIndex);
    if (onReorderImages) {
      onReorderImages(moveItem(keys, fromIndex, toIndex));
    }
    setPendingFocus({ key: keys[fromIndex], action: focusAction });
    setAnnouncement(
      toIndex === 0
        ? intl.formatMessage({ id: 'EditListingPhotosForm.announceCover' })
        : intl.formatMessage(
            { id: 'EditListingPhotosForm.announceMoved' },
            { position: toIndex + 1, count }
          )
    );
  };

  const resetDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
  };

  const dragPropsFor = index => {
    if (!canMove(index)) {
      return {};
    }
    return {
      draggable: true,
      onDragStart: e => {
        setDragIndex(index);
        if (e.dataTransfer) {
          e.dataTransfer.effectAllowed = 'move';
          // Firefox only starts a drag when some data is set.
          e.dataTransfer.setData('text/plain', keys[index] || '');
        }
      },
      onDragEnd: resetDrag,
    };
  };

  const dropPropsFor = index =>
    dragIndex === null
      ? {}
      : {
          onDragOver: e => {
            e.preventDefault();
            if (overIndex !== index) {
              setOverIndex(index);
            }
          },
          onDrop: e => {
            e.preventDefault();
            const from = dragIndex;
            resetDrag();
            reorder(from, index, ACTION_LATER);
          },
        };

  return (
    <>
      <ul className={css.imagesGrid}>
        {fields.map((name, index) => {
          const image = images[index];
          const key = keys[index] || name;
          const isCover = index === 0;
          const movable = canMove(index);
          const position = index + 1;
          const tileClasses = classNames(css.photoTile, {
            [css.photoTileMovable]: movable,
            [css.photoTileDragging]: dragIndex === index,
            [css.photoTileDropTarget]: overIndex === index && dragIndex !== index,
          });

          return (
            <li
              key={key}
              ref={el => {
                tileRefs.current[key] = el;
              }}
              className={tileClasses}
              {...dragPropsFor(index)}
              {...dropPropsFor(index)}
            >
              <FieldListingImage
                name={name}
                onRemoveImage={imageId => {
                  fields.remove(index);
                  onRemoveImage(imageId);
                }}
                intl={intl}
                aspectWidth={aspectWidth}
                aspectHeight={aspectHeight}
                variantPrefix={variantPrefix}
              />
              {isCover ? (
                <span className={css.coverBadge}>
                  <FormattedMessage id="EditListingPhotosForm.coverBadge" />
                </span>
              ) : null}
              {image && count > 1 ? (
                <div className={css.tileActions}>
                  <button
                    type="button"
                    className={css.orderButton}
                    data-photo-action={ACTION_EARLIER}
                    disabled={!movable || isCover}
                    onClick={() => reorder(index, index - 1, ACTION_EARLIER)}
                    aria-label={intl.formatMessage(
                      { id: 'EditListingPhotosForm.moveEarlier' },
                      { position, count }
                    )}
                  >
                    <IconChevron direction="left" />
                  </button>
                  {isCover ? (
                    <span className={css.tileActionsSpacer} />
                  ) : (
                    <button
                      type="button"
                      className={css.makeCoverButton}
                      data-photo-action={ACTION_COVER}
                      disabled={!movable}
                      onClick={() => reorder(index, 0, ACTION_LATER)}
                      aria-label={intl.formatMessage(
                        { id: 'EditListingPhotosForm.makeCoverLabel' },
                        { position, count }
                      )}
                    >
                      <FormattedMessage id="EditListingPhotosForm.makeCover" />
                    </button>
                  )}
                  <button
                    type="button"
                    className={css.orderButton}
                    data-photo-action={ACTION_LATER}
                    disabled={!movable || index === count - 1}
                    onClick={() => reorder(index, index + 1, ACTION_LATER)}
                    aria-label={intl.formatMessage(
                      { id: 'EditListingPhotosForm.moveLater' },
                      { position, count }
                    )}
                  >
                    <IconChevron direction="right" />
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
        <li className={css.addMoreTile}>{renderAddMore(dragIndex !== null)}</li>
      </ul>
      <p className={css.srOnly} aria-live="polite">
        {announcement}
      </p>
    </>
  );
};

// The portfolio needs MIN_PORTFOLIO_PHOTOS finished uploads before the step can be saved.
const minimumPhotos = message => images =>
  countUploadedImages(images) >= MIN_PORTFOLIO_PHOTOS ? undefined : message;

/**
 * The EditListingPhotosForm component ("Your portfolio", sign-up journey screen 10). With no
 * photos it shows one large upload tile; after that, a grid of photos (the first carries a
 * "Cover" badge, each has a remove button, and photos can be made the cover, moved or dragged
 * into a new order) ending in an "Add more" tile. At least 3 photos are
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
 * @param {Function} [props.onReorderImages] - Stores a new photo order (array of image keys)
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
          onReorderImages,
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

        const addImageField = (isEmptyState, ignoreDrags = false) => (
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
                  {isEmptyState ? (
                    // Run-through M8: phones and tablets can't drag files, so touch screens
                    // get "Tap to add photos". Chosen in CSS (pointer / hover media queries),
                    // so the server and browser render the same markup.
                    <>
                      <span className={css.pointerOnlyText}>
                        <FormattedMessage id="EditListingPhotosForm.chooseImage" />
                      </span>
                      <span className={css.touchOnlyText}>
                        <FormattedMessage id="EditListingPhotosForm.chooseImageTouch" />
                      </span>
                    </>
                  ) : (
                    <FormattedMessage id="EditListingPhotosForm.addMore" />
                  )}
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
            ignoreDrags={ignoreDrags}
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
                  <PortfolioGrid
                    fields={fields}
                    images={images}
                    onRemoveImage={onRemoveImage}
                    onReorderImages={onReorderImages}
                    disabled={submitInProgress}
                    renderAddMore={isReordering => addImageField(false, isReordering)}
                    aspectWidth={TILE_ASPECT_WIDTH}
                    aspectHeight={TILE_ASPECT_HEIGHT}
                    variantPrefix={variantPrefix}
                  />
                )
              }
            </FieldArray>

            <ImageUploadError
              uploadOverLimit={uploadOverLimit}
              uploadImageError={uploadImageError}
            />

            {images.length > 1 ? (
              <p className={css.tip}>
                <FormattedMessage id="EditListingPhotosForm.coverTip" />
              </p>
            ) : null}
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
