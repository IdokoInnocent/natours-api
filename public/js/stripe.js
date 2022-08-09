/* eslint-disable */
// import axios from 'axios';
// import { showAlert } from './alert';
// // const Stripe = require('stripe');

// const stripe = Stripe(
//   'pk_test_51LSMcuG3XYCPIa6ujTcOCxM3hbz4CqDpGhNuVTunXp9UwPLTOIna0mxriMUWN1CsI8oizUpgw9iLlVRU8xVFWGCa006LcmHRXN'
// );
// export const bookTour = async tourId => {
//   try {
//     const session = await axios(
//       `http://127.0.0.1:3000/api/v1/bookings/checkout-session/${tourId}`
//     );
//     console.log(session);
//     //  2) Create checkout form + charge credit card
//     await stripe.redirectToCheckout({
//       sessionId: session.data.session.id
//     });
//   } catch (err) {
//     console.log(err);
//     showAlert('error', err);
//   }
// };
