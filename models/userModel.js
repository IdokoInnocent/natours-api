const crypto = require('crypto'); // built-in node module
const mongoose = require('mongoose');
const validator = require('validator'); // from npm for validation
const bcrypt = require('bcryptjs'); // from npm

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please tell us your name']
  },

  email: {
    type: String,
    required: [true, 'Please provide your email'],
    unique: true,
    lowercase: true,
    validate: [validator.isEmail, 'Please provide a valid email address']
  },

  photo: {
    type: String,
    default: 'default.jpg'
  },

  role: {
    type: String,
    enum: ['user', 'guide', 'lead-guide', 'admin'],
    default: 'user'
  },

  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 8,
    select: false
  },

  confirmPassword: {
    type: String,
    required: [true, 'Please confirm your password'],

    // Custom validation
    validate: {
      // This only work on CREATE and SAVE
      validator: function(el) {
        return el === this.password; // el is the confirmPassword
      },
      message: 'Password are not the same!'
    }
  },

  // This field here is for deleteMe route. We really do not want users to be deleted completely from the database. but just set the active field to false
  active: {
    type: Boolean,
    default: true,
    select: false
  },

  passwordChangedAt: Date,
  passwordResetToken: String,
  passwordResetExpires: Date
});

// 1) PASSWORD MANAGEMENT. using document middleware to hash password when we create account.
userSchema.pre('save', async function(next) {
  // Only run this if password was modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12); //installed the bcrypt package: for hashing password

  // Delete the confirmPassword field
  this.confirmPassword = undefined;
  next();
});

////// 2) Middleware: Using document middleware to update the passwordChangedAt properties
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) next();

  this.passwordChangedAt = Date.now() - 1000; // So the user will be able to log in with delay
  next();
});

// 3) query middleware. when we delete users. we only want to show users that are active in the getAllUsers route.
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

// This is an instance method. method that is available on all documents of a certain collection
userSchema.methods.correctPassword = async function(
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword); //will return true if the candidatePassword(the one the user input ) and userPassword(the one registedr in the db)
};

// instance method to check if user changed password
userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// Instance method to generate reset token for forgot password
userSchema.methods.createPasswordResetToken = function() {
  // we imported crypto library.
  const resetToken = crypto.randomBytes(32).toString('hex'); // created the TOKEN

  // We need to hash the token
  this.passwordResetToken = crypto //we stored the encrypted token in the passwordResetToken field we created above. because it is going to be stored in the DB, preventing it from hackers.
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
  // console.log({ resetToken }, this.passwordResetToken);
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // Expiration date for the token. 10MIN

  return resetToken; // This is the UNCRYPTED TOKEN sent to the users email.
};

const User = mongoose.model('User', userSchema);

module.exports = User;
