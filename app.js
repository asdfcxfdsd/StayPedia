
// If we run in development mode, then we're going to take everything inside .dotenv file.
if (process.env.NODE_ENV !== "production") {
  require('dotenv').config()
}
//Confirm if it is working
// console.log(process.env) 



const express = require('express');
const app = express();
const path = require("path"); 
const fetch = require('node-fetch');
const port = 3000;
const mongoose = require('mongoose');
const mongo = require('mongodb')
const methodOverride = require('method-override')
const engine = require('ejs-mate');
const catchAsync = require("./utils/catchAsync"); 
const ExpressError = require("./utils/ExpressError"); 
const Joi = require("joi"); 
const Hotel = require("./models/hotel"); 
const Review = require('./models/review'); 
const {reviewSchema, hotelSchema} = require('./schema.js'); 
// Passport.js for Signing in and out features. 
const passport = require('passport'); 
const LocalStrategy = require("passport-local"); 
const User = require("./models/user"); 

const flash = require("connect-flash"); 
const axios = require("axios"); 

// const dbUrl = process.env.DB_URL || 'mongodb://localhost:27017/hotel-rating-system'; 
const dbUrl = 'mongodb://localhost:27017/hotel-rating-system'; 

mongoose.set('strictQuery', true);
mongoose.connect(dbUrl)
    .then(() => {
        console.log(" Mongo CONNECTEDD")
    })
    .catch((err) => {
        console.log("OHH Mongo Error Connection")
        console.log(err)
    })


// || 'mongodb://127.0.0.1:27017/hotel-rating-system'; 
// Using connect-mongo for our session store. 
const session = require('express-session');
const MongoDBStore = require('connect-mongo');
const secret = "thisisabadsecret"

const store = MongoDBStore.create({
  mongoUrl: dbUrl,
  secret,
  touchAfter: 24 * 60 * 60
})

store.on("error", function (e) {
  console.log("SESSION STORE ERROR!!", e);
});

// cookies parser 
const cookieParser = require("cookie-parser"); 
app.use(cookieParser()); 

// setting up express-session 
// const session = require('express-session');
const sessionConfig = {
  store,
  secret,
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
  // console.log(req.user);
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



// Wishlist Feature. 
app.get("/wishlist", async(req, res) => {
  const {id} = req.params; 
  // If someone is logged in , we showed the wishlist page. 
  if (req.user) {
    const user = await User.findById(req.user._id).populate('wishlist'); 
    console.log(user); 
    // res.redirect('/hotels', {user}); 
    res.render('wishlist', {user});
  } else {
    req.flash("error", "Please login first")
    res.redirect("/login")
  }
})


// Get the details of specific hotel. 
async function getPlaceDetail(place_id) {
  try {
    const url = "https://maps.googleapis.com/maps/api/place/details/json";
    const response = await axios.get(url, {
      params: {
        place_id: place_id,
        key: "AIzaSyBZAdBZuh2bgL823ekoZsvoo7Nt7XuZXKY",
      },
    });

    return response.data.result;
  } catch (e) {
    // if we can't get data from this place_id, then we return false.
    return false;
    console(e);
  }
}



// Add a hotel to user's wishlist.
app.post(
  "/hotels/:id/wishlist",
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    
    const user = await User.findById(req.user);
    const hotelFromApi = await getPlaceDetail(id); 

    if (hotelFromApi) {
      // if the hotel we want to add into wishlists is from API .
      //  res.send("DONE")
      // console.log(hotelFromApi)
     
      // convert place_id into ObjectID
      var newID = new mongo.ObjectID(hotelFromApi.place_id);

      user.wishlist.push(newID);
      await user.save()
      req.flash("success", "You add this hotel to your wishlist.");
      res.redirect(`/hotels/${hotelFromApi.place_id}`);
    } else {
      // if the hotel we want to add into wishlists is from MongoDB. 
      const hotelFromMongoDB = await Hotel.findById(id);
      user.wishlist.push(hotelFromMongoDB);
      await hotelFromMongoDB.save();
      await user.save()
      req.flash("success", "You add this hotel to your wishlist.");
      res.redirect(`/hotels/${hotelFromMongoDB._id}`);
    }

  })
);

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
    req.flash('error', 'Error occurred !!!')
    res.redirect('/hotels')
  }
})





app.all('*', (res, req, next) => {
  next(new ExpressError("Page Not Found !!!", 404))
})


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
