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

// async function getHotelFromApi(place_id) {
//   const url = 'https://maps.googleapis.com/maps/api/place/details/json'

//   const response = await axios.get(url, {
//     params: {
//       key: 'AIzaSyBZAdBZuh2bgL823ekoZsvoo7Nt7XuZXKY',
//       place_id: place_id
//     }
//   })

//   // console.log(response.data.result)
// }

// Get more detail information about one place with ID we got from place search api .

async function getPlaceDetail(place_id) {
  try {
    const url = "https://maps.googleapis.com/maps/api/place/details/json";
    const response = await axios.get(url, {
      params: {
        place_id: place_id,
        key: "AIzaSyBZAdBZuh2bgL823ekoZsvoo7Nt7XuZXKY",
      },
    });

    // name
    // description (editorial_summary.overview)
    // location (formatted_address)
    // Created by ..
    // $25/night

    // weekday_text
    // formatted_address
    // formatted_phone_number
    // rating
    return response.data.result;
  } catch (e) {
    // if we can't get data from this place_id, then we return false.
    return false;
    console(e);
  }
}

// Show all hotels
router.get(
  "/",
  catchAsync(async (req, res) => {
    const hotelsFromMongo = await Hotel.find({});
    const location = "47.608013, -122.335167";
    const radius = 5000;
    const keyword = "hotel";

    async function fetchHotelPhotos(hotelsData) {
    // Generate available image url from photo_reference of hotels we fetched from Google Nearby Search | Places API with Place Photos API. 

    // Then, add those available image url to original hotel data.

    // optimize the code to fetch hotel photos, consider making parallel requests to fetch photos concurrently, which can significantly improve performance when dealing with multiple photo fetches.

    // One way to do this is by using Promise.all with axios.all to make multiple HTTP requests simultaneously.
      const key = "AIzaSyBZAdBZuh2bgL823ekoZsvoo7Nt7XuZXKY";
      const maxWidth = 400; 

      try {
        //把格式變成{個別hotel資料 , 這hotel的首個相片網址}
        const requestPhotos = hotelsData.map(async(hotel) => {
          
            const photoRef = hotel.photos[0].photo_reference;
            const url = `https://maps.googleapis.com/maps/api/place/photo?key=${key}&photoreference=${photoRef}&maxwidth=${maxWidth}`;

            try {
              const response = await axios.get(url); 
              return {hotel, imageUrl: response.config.url}
            }catch(error) {
              console.error("Error fetching data:", error);
              return {hotel, imageUrl: null}
            }

        })

        const photos = await Promise.all(requestPhotos);
              
        // Put original array and imageUrl into new array.  
        // {hotel, imageUrl: response.config.url}
        photos.forEach((hotel, imageUrl) => {
          hotel.hotelImageUrl = imageUrl
        })
        return photos; 

      } catch(error) {
        // empty array if we got 
        res.render("error")
        return []; 
      }

    }


    searchHotelNearBy(location, radius, keyword)
      .then(async (hotelsDataFromNearByAPi) => {
        const hotelsWithPhotos = await fetchHotelPhotos(hotelsDataFromNearByAPi); 
        // console.log(hotelsWithPhotos)
        res.render("hotels/index", {hotelsWithPhotos, hotelsFromMongo})
      })
      .catch((error) => {
        console.log("Error: ", error);
        res.render("error")
      })
    
    
    // fetch hotel data from Google place Api.

    // searchHotelNearBy(location, radius, keyboard)
    //   .then(async(hotelsDataFromNearByApi) => {
    //     // Generate available image url from photo_reference of hotels we fetched from Google Nearby Search | Places API with Place Photos API. 
        
    //     // Then, add those available image url to original hotel data. 
    //     const hotelsWithPhotos = await fetchHotelPhotos(hotelsDataFromNearByApi); 
    //     res.render("hotels/index", {hotelsWithPhotos});
    //   })
    //   .catch((error) => {
    //     console.log("Error:", error);
    //     res.render("error")
    //   }) 

    // for (let hotel of hotelsDataFromNearByApi) {
    //   const key = "AIzaSyBZAdBZuh2bgL823ekoZsvoo7Nt7XuZXKY";
    //   const maxWidth = 400; 
    //   const photoRef = hotel.photos[0].photo_reference;
    //   const url = `https://maps.googleapis.com/maps/api/place/photo?key=${key}&photoreference=${photoRef}&maxwidth=${maxWidth}`;
  
    //   try {
    //     const response = await axios.get(url);
    //     hotel.newImg = response.config.url;
    //   } catch (error) {
    //     console.error("Error fetching data:", error);
    //   }
    // }
    

    
  })
);

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
    let allPhotosFromApi = [];

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

        // console.log(hotelInDatabase);

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

    console.log(hotel);
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

    // Update Images.

    // Turn req.files into the format we want.
    const imgs = req.files.map((f) => ({
      path: f.path,
      filename: f.filename,
    }));

    // Push new images to existing image array
    hotel.images.push(...imgs);

    // Delete images
    if (req.body.deleteImages) {
      // delete imgs from cloudinary
      for (let filename of req.body.deleteImages) {
        await cloudinary.uploader.destroy(filename);
      }
      await hotel.updateOne({
        $pull: { images: { filename: { $in: req.body.deleteImages } } },
      });
      console.log(req.body);
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

// Add a hotel to user's wishlist.
router.post(
  "/:id/wishlist",
  catchAsync(async (req, res, next) => {
    const { id } = req.params;
    const hotel = await Hotel.findById(id);
    const user = await User.findById(req.user);
    user.wishlist.push(hotel);
    await hotel.save();
    await user.save();

    req.flash("success", "Add the hotel to your wishlist.");
    res.redirect(`/hotels/${hotel._id}`);

    console.log(user);
  })
);

module.exports = router;
