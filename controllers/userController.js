const multer = require('multer');
const sharp = require('sharp');
const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');
const factory = require('./handlerFactory');

// This is when saving file to disk
// const multerStorage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'public/img/users');
//   },
//   filename: (req, file, cb) => {
//     const ext = file.mimetype.split('/')[1];
//     cb(null, `user-${req.user.id}-${Date.now()}.${ext}`);
//   }
// });

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

// middlewares
exports.uploadUserPhoto = upload.single('photo');

exports.resizeUserPhoto = catchAsync(async (req, res, next) => {
  if (!req.file) return next();
  req.file.filename = `user-${req.user.id}-${Date.now()}.jpeg`;
  await sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/users/${req.file.filename}`);
  next();
});

const filteredObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach(el => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

//  This route allows login user to update their datas except anything related to password
exports.updateMe = catchAsync(async (req, res, next) => {
  // Create error if user posts password data.
  if (req.body.password || req.body.confirmPassword) {
    return next(
      new AppError(
        'This is not the route for password updates. Please use /updateMyPassword',
        400
      )
    );
  }

  // 2) fIltered out fields that are not allowed to be updated in this route. eg password.
  // note the second argument in the findByIdAndUpdate function is what we want to update.
  const filteredBody = filteredObj(req.body, 'name', 'email'); // fields allowed to be updated
  if (req.file) filteredBody.photo = req.file.filename;

  // 3) Update document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });
  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// This function is for logged in user to retrieve his/ her own data.
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

//  We want current user to be able to delete him/herself. but we do not want to completely erase them from the database. but just set the active field to false. the default value is true for all users. note the second argument in the findByIdAndUpdate function is what we want to update.
exports.deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false }); // we want to update the active field to false. for user that have been deleted.

  res.status(204).json({
    status: 'success',
    data: null
  });
});

exports.createNewUser = (req, res) => {
  res.status(500).json({
    status: 'error',
    message: 'This route is not yet defined! Please use the signup instead'
  });
};

exports.getAllUsers = factory.getAll(User);
exports.getUser = factory.getOne(User);

// Do not update password with this.
exports.updateUser = factory.updateOne(User);

exports.deleteUser = factory.deleteOne(User);
