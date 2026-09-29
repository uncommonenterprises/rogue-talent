import React from 'react';
import '@testing-library/jest-dom';
import { Form as FinalForm, Field } from 'react-final-form';
import arrayMutators from 'final-form-arrays';

import { createImage, fakeIntl } from '../../../../util/testData';
import { renderWithProviders as render, testingLibrary } from '../../../../util/testHelpers';

import EditListingPhotosForm, { FieldAddImage } from './EditListingPhotosForm';

const { screen, userEvent, waitFor, act } = testingLibrary;

const noop = () => null;

describe('EditListingDeliveryForm', () => {
  it('matches snapshot', () => {
    const saveActionMsg = 'Save photos';
    const tree = render(
      <EditListingPhotosForm
        initialValues={{ country: 'US', images: [] }}
        intl={fakeIntl}
        dispatch={noop}
        onImageUpload={v => Promise.reject(v)}
        onSubmit={v => v}
        saveActionMsg={saveActionMsg}
        stripeConnected={false}
        updated={false}
        ready={false}
        updateInProgress={false}
        disabled={false}
        onRemoveImage={noop}
        listingImageConfig={{ aspectWidth: 1, aspectHeight: 1, variantPrefix: 'listing-card' }}
      />
    );
    expect(tree.asFragment()).toMatchSnapshot();
  });

  describe('portfolio minimum of 3 photos (sign-up journey screen 10)', () => {
    const renderWithImages = imageCount =>
      render(
        <EditListingPhotosForm
          initialValues={{
            images: Array.from({ length: imageCount }, (_, i) => createImage(`image-${i}`)),
          }}
          intl={fakeIntl}
          dispatch={noop}
          onImageUpload={v => Promise.resolve(v)}
          onSubmit={v => v}
          saveActionMsg="Continue"
          updated={false}
          ready={false}
          updateInProgress={false}
          disabled={false}
          onRemoveImage={noop}
          listingImageConfig={{ aspectWidth: 1, aspectHeight: 1, variantPrefix: 'listing-card' }}
        />
      );

    it('no photos: one large upload tile, "0 of 3 minimum" and Continue disabled', () => {
      renderWithImages(0);
      expect(screen.getByText('EditListingPhotosForm.chooseImage')).toBeInTheDocument();
      expect(screen.getByText('EditListingPhotosForm.minimumCounter')).toBeInTheDocument();
      expect(screen.getByText('EditListingPhotosForm.minimumHint')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('two photos: a grid with a Cover badge, remove buttons and "Add more"; still disabled', () => {
      renderWithImages(2);
      expect(screen.getAllByText('EditListingPhotosForm.coverBadge')).toHaveLength(1);
      expect(
        screen.getAllByRole('button', { name: 'EditListingPage.screenreader.removeImage' })
      ).toHaveLength(2);
      expect(screen.getByText('EditListingPhotosForm.addMore')).toBeInTheDocument();
      expect(screen.getByText('EditListingPhotosForm.minimumCounter')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled();
    });

    it('three photos: Continue is enabled and the minimum hint goes away', () => {
      renderWithImages(3);
      expect(screen.queryByText('EditListingPhotosForm.minimumCounter')).not.toBeInTheDocument();
      expect(screen.queryByText('EditListingPhotosForm.minimumHint')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Continue' })).toBeEnabled();
    });
  });

  // TODO to test this fully, we would need to check that store's state changes correctly.

  it('Check that FieldAddImage works', async () => {
    const user = userEvent.setup();
    const ACCEPT_IMAGES = 'image/*';
    const tree = render(
      <FinalForm
        onSubmit={noop}
        mutators={{ ...arrayMutators }}
        render={formRenderProps => {
          return (
            <form onSubmit={noop}>
              <FieldAddImage
                id="addImage"
                name="addImage"
                accept={ACCEPT_IMAGES}
                label={<div>label</div>}
                type="file"
                disabled={false}
                formApi={{
                  change: noop,
                  blur: noop,
                }}
                onImageUploadHandler={noop}
                aspectWidth={1}
                aspectHeight={1}
              />
            </form>
          );
        }}
      />
    );

    // Fill mandatory attributes
    const file = new File(['hello'], './public/static/icons/favicon-16x16.png', {
      type: 'image/png',
    });
    const input = screen.getByLabelText(/label/i);

    await user.upload(input, file);
    expect(input.files[0]).toBe(file);
    expect(input.files.item(0)).toBe(file);
    expect(input.files).toHaveLength(1);
  });
});
