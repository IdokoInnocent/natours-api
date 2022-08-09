const Tour = require('../models/tourModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

exports.getOverview = catchAsync(async (req, res) => {
  // 1) Get tour data from collection
  const tours = await Tour.find();

  //  2)Build Template
  //  3) Render that template using data
  res.status(200).render('overview', {
    title: 'This is the tour overview',
    tours
  });
});

exports.getTour = catchAsync(async (req, res, next) => {
  const tour = await Tour.findOne({ slug: req.params.slug }).populate({
    path: 'reviews',
    fields: 'rating review user'
  });

  if (!tour) {
    return next(new AppError('There is no tour with that name', 404));
  }
  res.status(200).render('tour', {
    title: `${tour.name} tour`,
    tour
  });
});

exports.getLoginForm = catchAsync(async (req, res) => {
  res.status(200).render('login', {
    title: 'Login to your account'
  });
});

exports.getSignupForm = catchAsync(async (req, res) => {
  res.status(200).render('signup', {
    title: 'Create your account'
  });
});

exports.getAccount = (req, res) => {
  res.status(200).render('account', {
    title: 'Your account'
  });
};
