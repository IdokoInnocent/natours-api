class APIFeatures {
  constructor(query, queryString) {
    this.query = query;
    this.queryString = queryString;
  }

  filter() {
    const queryObj = { ...this.queryString };
    const excludedFields = ['page', 'sort', 'limit', 'fields']; //removing fileds we do not want from the req.query
    excludedFields.forEach(el => delete queryObj[el]);

    // 1b) ADVANCE FILTERING
    let queryStr = JSON.stringify(queryObj);
    queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
    // console.log(JSON.parse(queryStr));
    this.query.find(JSON.parse(queryStr));

    return this;

    // let query = Tour.find(JSON.parse(queryStr));
  }

  sort() {
    if (this.queryString.sort) {
      const sortBy = this.queryString.sort.split(',').join(' '); //If we have two conditin(duration and price)
      this.query = this.query.sort(sortBy);
    } else {
      this.query = this.query.sort('-createdAt'); // default if there is no sort properties just sort by the latest data.
    }

    return this;
  }

  limitFields() {
    if (this.queryString.fields) {
      const fields = this.queryString.fields.split(',').join(' ');
      this.query = this.query.select(fields);
    } else {
      this.query = this.query.select('-__v');
    }

    return this;
  }

  pagination() {
    const page = this.queryString.page * 1 || 1;
    const limit = this.queryString.limit * 1 || 100;
    const skip = (page - 1) * limit;

    this.query = this.query.skip(skip).limit(limit);

    return this;
  }
}
module.exports = APIFeatures;

// Build Query
// 1a) Simple filter
// console.log(req.query)
// const queryObj = { ...req.query };
// const excludedFields = ['page', 'sort', 'limit', 'fields']; //removing fileds we do not want from the req.query
// excludedFields.forEach(el => delete queryObj[el]);

// // 1b) ADVANCE FILTERING
// let queryStr = JSON.stringify(queryObj);
// queryStr = queryStr.replace(/\b(gte|gt|lte|lt)\b/g, match => `$${match}`);
// // console.log(JSON.parse(queryStr));

// let query = Tour.find(JSON.parse(queryStr));
// EXECUTE QUERY

//  Sorting
// // 127.0.0.1:3000/api/v1/tours?sort=price,ratingsAverage
// if (req.query.sort) {
//   const sortBy = req.query.sort.split(',').join(' '); //If we have two conditin(duration and price)
//   query = query.sort(sortBy);
// } else {
//   query = query.sort('-createdAt'); // default if there is no sort properties just sort by the latest data.
// }

// 3) Limiting Fields
// in order to allow client to choose which fields they want to get back in the response.
// 127.0.0.1:3000/api/v1/tours?fields=name,duration,difficulty,price
// if (req.query.fields) {
//   const fields = req.query.fields.split(',').join(' ');
//   query = query.select(fields);
// } else {
//   query = query.select('-__v');
// }

// 4) PAGINATION
// const page = req.query.page * 1 || 1;
// const limit = req.query.limit * 1 || 100;
// const skip = (page - 1) * limit;

// query = query.skip(skip).limit(limit);

// if (req.query.page) {
//   const numTours = await Tour.countDocuments();
//   if (skip >= numTours) throw new Error('This page does not exist');
// }
