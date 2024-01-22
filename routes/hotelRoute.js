// First step is to create a file to put all our app routes.
//For exemple : /routes/products.js can contain all routes related to the product resource

const express = require("express");
const router = express.Router();
const Hotel = require("../models/hotel");
const User = require("../models/user");
const catchAsync = require("../utils/catchAsync");
const ExpressError = require("../utils/ExpressError");
const axios = require("axios");

const { hotelSchema } = require("../schema");

// To check out if the user is logging in.
const { isLoggedIn } = require("../middleware");

// Geocoding
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const mapBoxToken = process.env.MAPBOX_TOKEN;
const geocoder = mbxGeocoding({ accessToken: mapBoxToken });

//Multer is a node.js middleware for handling multipart/form-data, which is primarily used for uploading files.
// It is written on top of busboy for maximum efficiency.
const multer = require("multer");
const { storage, cloudinary } = require("../cloudinary/index");
const path = require("path");
// Store our images on Cloudinary.
const upload = multer({ storage });



// Use Joi to validate our hotel schema.
const validateHotel = (req, res, next) => {
  // Validate by using Joi, but we only want error part.
  const { error } = hotelSchema.validate(req.body);
  if (error) {
    const msg = error.details.map((el) => el.message).join(",");
    throw new ExpressError(msg, 400);
  } else {
    next();
  }
};

// Protect the backend logic.
// The hotel can't be edited if this hotel is not owned by current user.
const isAuthor = async (req, res, next) => {
  const { id } = req.params;
  const hotel = await Hotel.findById(id);

  if (req.user && !hotel.author.equals(req.user._id)) {
    req.flash("error", "You don't have permission to do that!!!");
    return res.redirect(`/hotels/${hotel._id}`);
  }
  next();
};

// Api integration to fetch hotels in specific area. Make real-time request to api.
async function searchHotelNearBy(location, radius, keyword) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;

    const response = await axios.get(url, {
      params: {
        location,
        radius,
        keyword,
        key: "AIzaSyAnPyzEna3eyAK60vXKGjVNhQ-nXOUwBho",
      },
    });

    if (response.data.status === "OK") {
      return response.data.results;
    } else {
      console.error(`Error in API response: ${response.data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`An error occurred: ${error.message}`);
    return null;
  }
}


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

// Show all hotels
router.get("/",catchAsync(async (req, res) => {
    const hotelsFromMongo = await Hotel.find({});
    const hotelsFromApi = [];
    res.render("hotels/index", {hotelsFromMongo, hotelsFromApi});
  })
);

// search by text 
router.post("/search", async(req, res) => {
    const axios = require('axios');
    const searchText = req.body.searchInput;    
  
    // get hotel data by google place text search api
    async function getHotelsInCountry(country) {
        try {
            const apiKey = 'AIzaSyAnPyzEna3eyAK60vXKGjVNhQ-nXOUwBho';
            const baseUrl = 'https://maps.googleapis.com/maps/api/place/textsearch/json';
  
            // Encode the country parameter to ensure it's URL-safe
            const encodedCountry = encodeURIComponent(`hotels in ${country}`);
  
            const apiUrl = `${baseUrl}?query=${encodedCountry}&key=${apiKey}`;
  
            // Make a GET request to the Places API
            const response = await axios.get(apiUrl);
  
            // Handle the response
            if (response.data.status === 'OK') {
                // Process the list of hotels
                const hotelsByCountry = response.data.results;
                
                // Fetch photos for each hotel and add them to hotelsByCountry
                const hotelsFromApi = await Promise.all(hotelsByCountry.map(fetchHotelPhotos));
                
                // Render the page with hotelsByCountry and searchText
                return res.render("hotels/index", { hotelsFromApi, searchText });
            } else {
                // Flash error and refresh the page if no hotels found.
                console.error('Error fetching hotel data:', response.data.status);
                res.flash("error", "No hotels found")
                res.redirect('/hotels')
            }
        } catch (error) {
            console.error('Error:', error.message);
        }
    }
  
    // Function to fetch photos for a hotel
    async function fetchHotelPhotos(hotel) {
        try {
            const apiKey = 'AIzaSyAnPyzEna3eyAK60vXKGjVNhQ-nXOUwBho';
            const baseUrl = 'https://maps.googleapis.com/maps/api/place/details/json';
  
            const apiUrl = `${baseUrl}?place_id=${hotel.place_id}&fields=photos&key=${apiKey}`;
  
            // Make a GET request to the Places API
            const response = await axios.get(apiUrl);
  
            // Handle the response
            if (response.data.status === 'OK' && response.data.result.photos) {
                const photoReferences = response.data.result.photos.map(photo => {
                    return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key=${apiKey}`;
                });
  
                hotel.photoUrls = photoReferences;
            } else {
                // If no photos found, assign an empty array
                hotel.photoUrls = [];
            }
        } catch (error) {
            console.error('Error fetching hotel photos:', error.message);
            // If an error occurs, assign an empty array
            hotel.photoUrls = [];
        }
  
        return hotel;
    }
  
    // Call the asynchronous function
    getHotelsInCountry(searchText);
  });



// Render new hotel form.
router.get("/new", isLoggedIn, (req, res) => {
  res.render("hotels/new");
});


// Render show page to see the details of each hotel.
router.get(
  "/:id",
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const hotelFromApi = await getPlaceDetail(id);
    console.log(hotelFromApi)
    try {
      if (!hotelFromApi) {
        const hotelInDatabase = await Hotel.findById(id)
          // Populate author of each reviews(review.author) .
          // It will help us showing who made individual review.
          .populate({
            path: "reviews",
            populate: {
              path: "author",
            },
          })
          // populate hotel.author.
          .populate("author");

        console.log(hotelInDatabase);
        res.render("hotels/show", { hotelInDatabase });
      } else {
       // Get all photos of the hotel.
const getHotelPhoto = async () => {
  let allPhotosFromApi = [];
  try {
    const photoReferences = hotelFromApi.photos.map((photo) => photo.photo_reference);

    const key = "AIzaSyBZAdBZuh2bgL823ekoZsvoo7Nt7XuZXKY";
    const maxWidth = 400;

    const fetchPhotos = photoReferences.map(async (photoRef) => {
      const url = `https://maps.googleapis.com/maps/api/place/photo?key=${key}&photoreference=${photoRef}&maxwidth=${maxWidth}`;
      try {
        const response = await axios.get(url);
        allPhotosFromApi.push(response.config.url);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    });

    await Promise.all(fetchPhotos);
    return allPhotosFromApi;
  } catch (error) {
    console.error("Error:", error);
    return allPhotosFromApi;
  }
};

getHotelPhoto()
  .then((allPhotosFromApi) => {
    // Render page for hotel from Google Api.
    res.render("hotels/show2", { hotelFromApi, allPhotosFromApi });
    
    // console.log(allPhotosFromApi);
  })
  .catch((error) => {
    console.error("Error:", error);
    res.render("errorPage"); // Render an error page in case of failure
  });

      }
    } catch (e) {
      // Flash Error Message if the Hotel we're looking for doesn't exist.
      req.flash("error", "Cannot find this hotel !!!");
      res.redirect("/hotels");
    }
  })
);

// Create a new hotel

router.post(
  "/",
  isLoggedIn,
  upload.array("image"),
  validateHotel,
  catchAsync(async (req, res, next) => {
    // Mapbox
    const geoData = await geocoder
      .forwardGeocode({
        query: req.body.hotel.location,
        limit: 1,
      })
      .send();
    // res.send(geoData.body.features[0].geometry.coordinates);
    const hotel = new Hotel(req.body.hotel);
    // save geoData on new hotel instance
    hotel.geometry = geoData.body.features[0].geometry;

    // Loop req.files where we retrieve the data from multer.
    // req.files is array of `image` files.
    // we put this array into hotel.image.
    hotel.images = req.files.map((f) => ({
      path: f.path,
      filename: f.filename,
    }));
  

    // We'll save current user to hotel.author filed when we create a new hotel.
    hotel.author = req.user._id;
    await hotel.save();

    // Define the flash message if we create a new hotel.
    req.flash("success", "Successfully made a new hotel !!!");
    res.redirect(`/hotels/${hotel._id}`);
  })
);

// render update page
router.get(
  "/:id/edit",
  isAuthor,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    const hotel = await Hotel.findById(id);

    // Flash Error Message If we want to edit the Hotel doesn't exist.
    if (!hotel) {
      req.flash("error", "Cannot find that hotel !!!");
      res.redirect("/hotels");
    }

    
    res.render("hotels/edit", { hotel });
  })
);

// Update the hotel.
router.put(
  "/:id",
  isAuthor,
  upload.array("image"),
  catchAsync(async (req, res) => {
    const { id } = req.params;

    console.log(req.body);

    const hotel = await Hotel.findByIdAndUpdate(id, { ...req.body.hotel });

    // ADD MORE PHOTOS 
    
    // Turn req.files into the format we want.
    const imgs = req.files.map((f) => ({
      path: f.path,
      filename: f.filename,
    }));
    // Push new photos to existing image array
    hotel.images.push(...imgs);
    

    // Delete images backend
    if (req.body.deleteImages) {
      // Delete images from Cloudinary 
      for (let filename of req.body.deleteImages) {
        await cloudinary.uploader.destroy(filename);
      }
      await hotel.updateOne({
        $pull: { images: { filename: { $in: req.body.deleteImages } } },
      });
    }

    await hotel.save();

    // Define our flash message if we edit the hotel.
    req.flash("success", "Successfully update a hotel !!!!");

    res.redirect(`/hotels/${hotel._id}`);
  })
);

// delete a hotel
router.delete(
  "/:id",
  isAuthor,
  catchAsync(async (req, res) => {
    const { id } = req.params;
    await Hotel.findByIdAndDelete(id);

    // Define flash message if we delete hotel.
    req.flash("success", "Successfully delete a hotel ! ");

    res.redirect(`/hotels`);
  })
);



module.exports = router;
