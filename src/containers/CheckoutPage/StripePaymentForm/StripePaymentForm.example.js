import { fakeIntl } from '../../../util/testData';
import StripePaymentForm from './StripePaymentForm';

const noop = () => null;

export const Empty = {
  component: StripePaymentForm,
  props: {
    formId: 'StripePaymentFormExample',
    authorDisplayName: 'Janne K',
    paymentInfo: 'You might or might not be charged yet',
    onChange: values => {
      console.log('form onChange:', values);
    },
    onSubmit: values => {
      console.log('form onSubmit:', values);
    },
    intl: fakeIntl,
    isBooking: true,
    locale: 'en',
    marketplaceName: 'MarketplaceX',
    onCreateStripePaymentToken: noop,
    onStripeInitialized: noop,
    stripePaymentTokenInProgress: false,
    stripePaymentTokenError: null,
    stripePublishableKey: 'pk_test_asdfasdf',
    transactionFieldConfigs: [],
  },
  group: 'forms',
};

// B06 booking checkout layout (Rogue Talent): shoot details, content licence, payment.
const shootFields = [
  {
    key: 'shoot_type',
    scope: 'protected',
    schemaType: 'enum',
    showTo: 'customer',
    label: 'Shoot type',
    enumOptions: [
      { option: 'fashion', label: 'Fashion' },
      { option: 'lookbook', label: 'Lookbook' },
      { option: 'e-commerce', label: 'E-commerce' },
    ],
    saveConfig: { required: true },
  },
  {
    key: 'shoot_description',
    scope: 'protected',
    schemaType: 'text',
    showTo: 'customer',
    label: 'Shoot description',
    saveConfig: { required: true },
  },
  {
    key: 'location_type',
    scope: 'protected',
    schemaType: 'enum',
    showTo: 'customer',
    label: 'Location type',
    enumOptions: [
      { option: 'professional-studio', label: 'Professional studio' },
      { option: 'brand-office-showroom', label: 'Brand office/showroom' },
      { option: 'outdoor-public', label: 'Outdoor/public' },
      { option: 'private-residence', label: 'Private residence' },
      { option: 'other', label: 'Other' },
    ],
    saveConfig: { required: true },
  },
  {
    key: 'shoot_address',
    scope: 'protected',
    schemaType: 'text',
    showTo: 'customer',
    label: 'Shoot address',
    saveConfig: { required: true },
  },
];

export const BookingLayout = {
  component: StripePaymentForm,
  props: {
    formId: 'StripePaymentFormBookingExample',
    providerDisplayName: 'Ava',
    onSubmit: values => {
      console.log('form onSubmit:', values);
    },
    initialValues: { name: 'Ben Carter', country: 'GB' },
    intl: fakeIntl,
    isBooking: true,
    bookingLayout: true,
    bookingDatesLabel: 'Wed 25 Nov to Thu 26 Nov',
    bookingDayCountLabel: '2 full days',
    listingLinkParams: { id: '00000000-0000-0000-0000-000000000001', slug: 'ava-c' },
    totalPrice: '£1,035',
    showInitialMessageInput: true,
    showTransactionFields: true,
    transactionFieldConfigs: shootFields,
    locale: 'en',
    marketplaceName: 'Rogue Talent',
    onStripeInitialized: noop,
    stripePublishableKey: 'pk_test_asdfasdf',
  },
  group: 'forms',
};
