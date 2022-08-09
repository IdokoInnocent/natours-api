const mongoose = require('mongoose');
const Tour = require('./../models/tourModel');
// const slugify = require('slugify');

const reviewSchema = new mongoose.Schema(
  {
    review: {
      type: String,
      required: [true, 'Review can not be empty']
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    createdAt: {
      type: Date,
      default: Date.now()
    },

    tour: {
      type: mongoose.Schema.ObjectId,
      ref: 'Tour',
      required: [true, 'Review must belong to a tour.']
    },

    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Review must belong to a user']
    }
  },
  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Preventing duplicate review from the same user
reviewSchema.index({ tour: 1, user: 1 }, { unique: true });

// Populating the review using query middleware
// reviewSchema.pre(/^find/, function(next) {
//   this.populate({ path: 'tour', select: 'name' }).populate({
//     path: 'user',
//     select: 'name photo'
//   });
//   next();
// });

reviewSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'name photo'
  });
  next();
});

// Calculating number of ratings and averageRating.
reviewSchema.statics.calcAverageRatings = async function(tourId) {
  const stats = await this.aggregate([
    {
      $match: { tour: tourId }
    },
    {
      $group: {
        _id: '$tour',
        nRating: { $sum: 1 },
        avgRating: { $avg: '$rating' }
      }
    }
  ]);
  if (stats.length > 0) {
    // Persist it in the database
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: stats[0].nRating,
      ratingsAverage: stats[0].avgRating
    });
  } else {
    await Tour.findByIdAndUpdate(tourId, {
      ratingsQuantity: 0,
      ratingsAverage: 4.5
    });
  }
};

// when a review is created on a tour
reviewSchema.post('save', function() {
  // this points to current review
  this.constructor.calcAverageRatings(this.tour);
});

// findByIdAndUpdate
// findByIdAndDelete

reviewSchema.pre(/^findOneAnd/, async function(next) {
  this.r = await this.findOne(); // At this point we are getting the current document
});

// when a review is updated or deleted.
reviewSchema.post(/^findOneAnd/, async function(next) {
  await this.r.constructor.calcAverageRatings(this.r.tour); // Deleting or updating review
});

const Review = mongoose.model('Review', reviewSchema);

module.exports = Review;
