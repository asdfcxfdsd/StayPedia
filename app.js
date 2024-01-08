
// If we run in development mode, then we're going to take everything inside .dotenv file.
if (process.env.NODE_ENV !== "production") {
  require('dotenv').config()
}
//Confirm if it is working
// console.log(process.env) 



const express = require('express');
const app = express();
const path = require("path"); 
// Define the port number
const port = 3000;
const methodOverride = require('method-override')
const engine = require('ejs-mate');
// import catchAsync to help us handle errors for async functions. 
const catchAsync = require("./utils/catchAsync"); 
const ExpressError = require("./utils/ExpressError"); 
// JOI SCHEMA VALIDATION 
const Joi = require("joi"); 
// import  Hotel Model. 
const Hotel = require("./models/hotel"); 
// import Review Model. 
const Review = require('./models/review'); 
// Import schema for validation. 
const {reviewSchema, hotelSchema} = require('./schema.js'); 

// Passport.js for Signing in and out features. 
const passport = require('passport'); 
const LocalStrategy = require("passport-local"); 
const User = require("./models/user"); 

const flash = require("connect-flash"); 
const axios = require("axios"); 

const dbUrl = process.env.DB_URL; 

// Using connect-mongo for our session store. 
const session = require('express-session');
const MongoStore = require('connect-mongo');
const store = MongoStore.create({
  mongoUrl: dbUrl,
  touchAfter: 24 * 60 * 60,
  crypto: {
      secret: 'squirrel'
  }
});

// cookies parser 
const cookieParser = require("cookie-parser"); 
app.use(cookieParser()); 

// setting up express-session 
// const session = require('express-session');
const sessionConfig = {
  store,
  secret: 'thisshouldbeabettersecret!',
  resave: false,
  saveUninitialized: true,
  cookie: {
      httpOnly: true,
      expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
      maxAge: 1000 * 60 * 60 * 24 * 7
  }
}
app.use(session(sessionConfig)); 

// Configure Passport/Passport-Local
app.use(passport.initialize()); 
app.use(passport.session()); 

passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// Setting up flash 
app.use(flash()); 

// So every view will access to res.locals we defined. 
app.use((req, res, next) => {
  // req.user is stored in session. Thanks to Passport.js. 
  res.locals.currentUser = req.user; 
  res.locals.success = req.flash('success'); 
  res.locals.error = req.flash('error'); 
  next(); 
})




// router 
const hotelRoutes = require('./routes/hotelRoute'); 
const reviewRoutes = require('./routes/reviewRoute'); 
const userRoutes = require('./routes/userRoutes'); 

app.use(express.json());
// Parse req.body. 
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'));

// use ejs-locals for all ejs templates
app.engine('ejs', engine); 

// mongoose setup, getting-started.js
const mongoose = require('mongoose');
const { error } = require('console');
const { name } = require('ejs');
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect(dbUrl).then(() => {
    console.log("Database connected !!!")
  })
}

// Configure view directory 
app.set('views', path.join(__dirname, 'views'))// public directory
app.set('view engine', 'ejs');

app.use(express.static(path.join(__dirname, 'public')));
console.log(path.join(__dirname, 'views'));





// USE ROUTER 
// /hotels/* will be sent to our hotelRouter.

// All Routes of Hotels. 
app.use("/hotels", hotelRoutes);
// All Routes of Review. 
app.use("/hotels/:id/reviews", reviewRoutes); 
// All Routes of User. 
app.use("/", userRoutes); 




app.get('/', (req, res) => {
  res.render("home");
});


app.get("/hello", (req, res) => {
  console.log("Hello From Here")
})


// Wishlist Feature. 
app.get("/wishlist", async(req, res) => {
  const {id} = req.params; 
  if (req.user) {
    const user = await User.findById(req.user._id).populate('wishlist'); 
    console.log(user); 
    // res.redirect('/hotels', {user}); 
    res.render('wishlist', {user});
  }
})
// Delete Item in Wishlist.
app.delete('/wishlist/:hotelId', async(req, res, next) => {
  try {
  const {hotelId} = req.params; 
  const user = await User.findById(req.user._id);

  // Find the index of item we want to delete. 
  const indexOfDeleteItem = user.wishlist.indexOf(hotelId); 
  // Remove the hotel ID from the wishlist array 
  if (indexOfDeleteItem > -1) {
    user.wishlist.splice(indexOfDeleteItem, 1); 
  }

  // Save the updated user document
  await user.save();

  req.flash("success", "Successfully remove the hotel from your wishlist !");
  res.redirect('/wishlist'); 

  } catch (e) {
    console.log(e); 

  }
})




// The purpose of this middleware function is to handle any requests that do not match any existing route. 

// In this case, it will create a new ExpressError object with the message "Page Not Found!!!" and a status code of 404 (Not Found). This error will then be passed to the next middleware function in the chain, 
// which will typically be the error handling middleware provided by the Express framework.
// This code is used to provide a generic error message and status code for any requests that do not match any existing routes in the application.
app.all('*', (res, req, next) => {
  next(new ExpressError("Page Not Found !!!", 404))
})



// The app.use method is used as a middleware, when we want certain actions to be potentially handled in all routes, or before any routes, for example. 
// Overall, this middleware function is used to handle errors that occur during the processing of a request and provide a meaningful response to the client.
app.use((err, req, res, next) => {
  const {statusCode=500, message = "Something Went Wrong !!!"} = err; 

  if (!err.message) err.message = "Oh No, Something Went Wrong !!!" 
  // render the error.ejs we create if something goes wrong. 
  res.status(statusCode).render('error', {err}); 
}) 








// Start the server and listen on the specified port
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
