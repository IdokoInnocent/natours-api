const multer = require('multer');
const sharp = require('sharp');
const Tour = require('./../models/tourModel');
const catchAsync = require('./../utils/catchAsync');
const factory = require('./handlerFactory');
const AppError = require('./../utils/appError');

// This is when saving file to memory. buffer
const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image! Please upload only image.', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter
});

// We are uploading multiple images for diffrent fields
exports.uploadTourImages = upload.fields([
  { name: 'imageCover', maxCount: 1 },
  { name: 'images', maxCount: 3 }
]);

// if we have one field that accept multiple images
// upload.array('images', 5);

exports.resizeTourImages = catchAsync(async (req, res, next) => {
  // console.log(req.files);
  if (!req.files.imageCover || !req.files.images) next();

  // Cover image
  req.body.imageCover = `tour-${req.params.id}-${Date.now()}-cover.jpeg`;
  await sharp(req.files.imageCover[0].buffer)
    .resize(2000, 1333)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/tours/${req.body.imageCover}`);

  // Images
  req.body.images = [];
  await Promise.all(
    req.files.images.map(async (file, i) => {
      const fileName = `tour-${req.params.id}-${Date.now()}-${i + 1}.jpeg`;

      await sharp(file.buffer)
        .resize(2000, 1333)
        .toFormat('jpeg')
        .jpeg({ quality: 90 })
        .toFile(`public/img/tours/${fileName}`);

      req.body.images.push(fileName);
    })
  );
  next();
});

// MIDDLEWARE
exports.aliasTopTours = (req, res, next) => {
  req.query.limit = '5';
  req.query.sort = '-ratingsAverage, price';
  req.query.fields = 'name,price,ratingsAverage,summary,difficulty';
  next();
};

exports.getAllTours = factory.getAll(Tour);

exports.getTour = factory.getOne(Tour, { path: 'reviews' });

exports.createNewTour = factory.createOne(Tour);

exports.updateTour = factory.updateOne(Tour);

exports.deleteTour = factory.deleteOne(Tour);

// AGGRAGATION PIPELINES: CALCULATING AVERAGES, MINPRICE, MAXPRICE ...
exports.getTourStats = catchAsync(async (req, res, next) => {
  const stats = await Tour.aggregate([
    {
      $match: { ratingsAverage: { $gte: 4.5 } }
    },
    {
      $group: {
        //_id: null, // All fields
        _id: '$difficulty', //based on difficulty
        numTours: { $sum: 1 },
        numRating: { $sum: '$ratingsQuantity' },
        avgRating: { $avg: '$ratingsAverage' },
        avgPrice: { $avg: '$price' },
        minPrice: { $min: '$price' },
        maxPrice: { $max: '$price' }
      }
    },

    {
      $sort: { avgPrice: 1 } //ASCENDING ORDER
    }

    // {
    //   $match: { _id: { $ne: 'easy' } } // This is going to exclude all tours that are easy
    // }

    // WE CAN DO MULTIPLE MATCH
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats
    }
  });
});

// AGGREGATION PIPELINE: CALCULATING THE BUSIEST MONTH.
exports.getMonthlyPlan = catchAsync(async (req, res, next) => {
  const year = req.params.year * 1; //conver the string  to number
  const plan = await Tour.aggregate([
    {
      $unwind: '$startDates'
    },

    {
      $match: {
        startDates: {
          $gte: new Date(`${year}-01-01`),
          $lte: new Date(`${year}-12-31`)
        }
      }
    },

    {
      $group: {
        _id: { $month: '$startDates' }, //grouping based on month
        numTourStarts: { $sum: 1 }, // how many tours start in a particular month
        tours: { $push: '$name' } // tours by their name. array
      }
    },

    {
      $addFields: { month: '$_id' } // we added a new field that will hold the month in the id above.
    },

    {
      $project: { _id: 0 } // we do not want the id anymore
    },

    {
      $sort: { numTourStarts: -1 } // Desecnding order
    }

    // {
    //   $limit: 6
    // }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      plan
    }
  });
});

// tours-within/:distance/center/:latlng/unit/:unit
exports.getToursWithin = catchAsync(async (req, res, next) => {
  const { distance, latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');
  const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng',
        400
      )
    );
  }
  const tours = await Tour.find({
    startLocation: { $geoWithin: { $centerSphere: [[lng, lat], radius] } }
  });

  console.log(distance, lat, lng, unit);
  res.status(200).json({
    status: 'success',
    results: tours.length,
    data: {
      data: tours
    }
  });
});

exports.getDistances = catchAsync(async (req, res, next) => {
  const { latlng, unit } = req.params;
  const [lat, lng] = latlng.split(',');

  const multiplier = unit === 'mi' ? 0.000621371 : 0.001;

  if (!lat || !lng) {
    next(
      new AppError(
        'Please provide latitude and longitude in the format lat, lng',
        400
      )
    );
  }
  const distances = await Tour.aggregate([
    {
      // This should always be the first field when using geospatial aggregation
      $geoNear: {
        near: {
          type: 'Point',
          coordinates: [lng * 1, lat * 1]
        },

        distanceField: 'distance', // This is the field that will be created and where all the distances will be stored
        distanceMultiplier: multiplier
      },

      // The project allows us to only see name and distance in the output
      $project: {
        distance: 1,
        name: 1
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: {
      data: distances
    }
  });
});
