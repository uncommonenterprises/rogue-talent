import * as googleMapsUtil from '../../util/googleMaps';

import GeocoderGoogleMaps from './GeocoderGoogleMaps';

// Run-through 01/11/2026, finding 4: "About you" suggests towns and cities only.
describe('GeocoderGoogleMaps.getPlacePredictions', () => {
  let spy;

  beforeEach(() => {
    window.google = { maps: { places: { AutocompleteSessionToken: function() {} } } };
    spy = jest
      .spyOn(googleMapsUtil, 'getPlacePredictions')
      .mockResolvedValue({ search: 'Man', predictions: [] });
  });

  afterEach(() => {
    spy.mockRestore();
    delete window.google;
  });

  it('restricts suggestions to cities when asked', async () => {
    await new GeocoderGoogleMaps().getPlacePredictions('Man', ['GB'], 'en-GB', ['(cities)']);
    const searchConfigurations = spy.mock.calls[0][2];
    expect(searchConfigurations).toEqual({
      includedRegionCodes: ['GB'],
      includedPrimaryTypes: ['(cities)'],
    });
  });

  it('keeps full addresses (no type filter) by default, e.g. the business address', async () => {
    await new GeocoderGoogleMaps().getPlacePredictions('1 High St', ['GB'], 'en-GB');
    const searchConfigurations = spy.mock.calls[0][2];
    expect(searchConfigurations).toEqual({ includedRegionCodes: ['GB'] });
    expect(searchConfigurations).not.toHaveProperty('includedPrimaryTypes');
  });
});
