const mongoose = require('mongoose');
const slugify = require('slugify');
// const User = require('./../models/userModel');
// const validator = require('validator'); // from npm for validation

// schema
const tourSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'A tour must have a name'],
      unique: true,
      trim: true,

      // The maxlength and minlength are only used on strings
      maxlength: [40, 'A tour must have less or equal than 40 characters'],
      minlength: [10, 'A tour must have more or equal than 10 characters']

      // how we used the validation library. we want the tour name to noly contain alpha.
      // validate: [validator.isAlpha, 'Tour name must only contain characters']
    },

    slug: String,

    duration: {
      type: Number,
      required: [true, 'A tour must have a duration']
    },

    maxGroupSize: {
      type: Number,
      required: [true, 'A tour must have a group size']
    },

    difficulty: {
      type: String,
      required: [true, 'A tour must have a difficulty'],

      // only for string
      enum: {
        values: ['easy', 'medium', 'difficult'],
        message: 'Difficulty is either: easy, medium, difficult'
      }
    },

    ratingsAverage: {
      type: Number,
      default: 4.5,
      // This is for numbers, and dates also
      min: [1, 'Rating must be above 1.0'],
      max: [5, 'Rating must be below 5.0'],
      set: val => Math.round(val * 10) / 10 // 4.6666666, 46.666, 47, 4.7
    },

    ratingsQuantity: {
      type: Number,
      default: 0
    },

    price: {
      type: Number,
      required: [true, 'A tour must have a price']
    },

    priceDiscount: {
      type: Number,

      // CUSTOM VALIDATOR
      validate: {
        validator: function(val) {
          // the this keyword only points to current document on a new document creation and not update
          return val < this.price;
        },
        message: 'Discount price ({VALUE}) should be below regular price'
      }
    },

    summary: {
      type: String,
      trim: true,
      required: [true, 'A tour must have a description ']
    },

    description: {
      type: String,
      trim: true
    },

    imageCover: {
      type: String,
      required: [true, 'A tour must a cover image']
    },

    images: [String],

    createdAt: {
      type: Date,
      default: Date.now()
    },
    startDates: [Date],

    secretTour: {
      type: Boolean,
      default: false
    },

    startLocation: {
      // GeoJSON
      type: {
        type: String,
        default: 'Point',
        enum: ['Point']
      },
      coordinates: [Number],
      address: String,
      description: String
    },

    // Embedded Document
    locations: [
      {
        type: {
          type: String,
          default: 'Point',
          enum: ['Point']
        },
        coordinates: [Number],
        address: String,
        description: String,
        day: Number
      }
    ],

    // Embedding
    // guides: Array

    //Child Referencing.
    guides: [
      {
        type: mongoose.Schema.ObjectId,
        ref: 'User'
      }
    ]
  },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

tourSchema.index({ price: 1, ratingsAverage: -1 });
tourSchema.index({ slug: 1 });
tourSchema.index({ startLocation: '2dsphere' });

// VIRTUAL PROPERTIES
tourSchema.virtual('durationWeeks').get(function() {
  return this.duration / 7;
});

// Virtual Populate.
tourSchema.virtual('reviews', {
  ref: 'Review',
  foreignField: 'tour',
  localField: '_id'
});

// DOCUMENT MIDDLEWARE IN MONGOOSE: runsbefore .save() and .create()
tourSchema.pre('save', function(next) {
  this.slug = slugify(this.name, { lower: true });
  next();
});

tourSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'guides',
    select: '-__v -passwordChangedAt'
  });
  next();
});

// This document middleware is when we are are embedding user in the gides array
// tourSchema.pre('save', async function(next) {
//   const guidesPromises = this.guides.map(async id => await User.findById(id));
//   this.guides = await Promise.all(guidesPromises);
//   next();
// });

// tourSchema.pre('save', function(next) {
//   console.log('I will save this document...');
//   next();
// });

// tourSchema.post('save', function(doc, next) {
//   console.log(doc);
//   next();
// });

// QUERY MIDDLEWARE: Allows us to run function before or after a certain QUERY is executed
// tourSchema.pre('find', function(next) {
tourSchema.pre(/^find/, function(next) {
  this.find({ secretTour: { $ne: true } }); // find tours that secretTour is not set to true
  next();
});

// AGGREGATION PIPELINE: Allows us to add hooks before ore after an aggregation happens. we want to hide the secret tours from the aggregation.
tourSchema.pre('aggregation', function(next) {
  this.pipeline().unshift({ $match: { secretTour: { $ne: true } } }); // we set another match stage to filter out the secretTour.
  next();
});

const Tour = mongoose.model('Tour', tourSchema);

module.exports = Tour;
