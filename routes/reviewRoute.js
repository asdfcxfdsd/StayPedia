const express = require("express"); 
const router = express.Router({mergeParams: true}); 
const Review = require("../models/review");
const Hotel = require("../models/hotel"); 
const catchAsync = require("../utils/catchAsync"); 
const {reviewSchema} = require('../schema'); 
const { isLoggedIn } = require("../middleware");
const ExpressError = require("../utils/ExpressError");

// Use Joi to validate our review schema. 
const validateReview = async(req, res, next) => {
    const {error} = reviewSchema.validate(req.body);
 
    if (error) {
     const msg = error.details.map(el => el.message).join(","); 
     throw new ExpressError(msg, 400);  
    }  else {
     next(); 
    }
 }


// Protect backend logic. 
const isReviewAuthor = async(req, res, next) => {
  // /hotels/:id/reviews/reviewID
  const {id, reviewID} = req.params; 
  const review = await Review.findById(reviewID); 

    if (!review.author.equals(req.user._id)) {
      req.flash("error", "You don't have permission to do that!!!"); 
      return res.redirect(`/hotels/${id}`)
    }
    next(); 
}


// Create a new review 
router.post("/", isLoggedIn , validateReview ,catchAsync(async(req, res) => {
    const {id} = req.params; 
    const hotel = await Hotel.findById(id); 
    // req.body.review is where we put into 
    const review =  new Review(req.body.review);

    // Store the user who created the review to review.author . 
    review.author = req.user._id; 
    


    // Push review we got to the review section of specific hotel. 
    hotel.reviews.push(review); 
  
  // Save the object to the database. 
    await review.save();
    await hotel.save();
    
    // Define flash message if we create a new review. 
    req.flash('success', "Successfully create a new review ! ")
    res.redirect(`/hotels/${hotel._id}`);
    
  }))
  
  // Deleting Reviews 
  // why don't we save after deleting review. 
  //When you delete an object, that action is permanent, and the object is no longer found in the database, so if you try to save that same object that was just deleted, an error will indeed be thrown. You don't need to save findByIdAndDelete() operations.
  //When you're updating the object, then you need to save those changes, as they're are not applied in the database automatically, the save() method is needed.
  
  router.delete("/:reviewID", isLoggedIn, isReviewAuthor ,async(req, res, next) => {
    const {id, reviewID} = req.params;
  
    // pull from review array that have reviewID. 
    const hotel = await Hotel.findByIdAndUpdate(id, {
      $pull: {reviews:reviewID} 
    }); 
  
    await Review.findByIdAndDelete(reviewID); 
  
    // Define flash message if we delete review. 
    req.flash('success', "Successfully delete a review ! ")

    res.redirect(`/hotels/${id}`); 
  
  })








module.exports = router; 