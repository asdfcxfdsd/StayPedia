const mongoose = require("mongoose"); 
const { Schema } = mongoose;
const Review = require('./review'); 
const opts = { toJSON: { virtuals: true } };

// https://res.cloudinary.com/douqbebwk/image/upload/w_300/v1600113904/YelpCamp/gxgle1ovzd2f3dgcpass.png


const ImgSchema = new Schema ({
    path: String, 
    filename: String
}, opts);


// we want to resize the size of every images.
// use virtuals to set multiple properties at once as an alternative to custom setters on normal properties.
// for (img of hotel.images) {img.thumbnail}
ImgSchema.virtual('thumbnail').get(function() {
    return this.path.replace('/upload', '/upload/w_300')
})




const hotelSchema = new Schema({
    title: String, 
    images: [
        ImgSchema
    ],  
    geometry: {
        type: {
            type: String,
            enum: ['Point'],
            required: true
          },
          coordinates: {
            type: [Number],
            required: true
          }
    }, 
    location: String, 
    price: Number, 
    description: String, 
    // Every hotel is created by a specific user. 
    author: {
        type:Schema.Types.ObjectId, 
        ref: "User"
    }, 
    // The field is called "reviews" and is an array of objects. 
    // This field is a reference to another document in the database, specifically the "Review" document. 
    // This means that each review in the "reviews" array is associated with a specific review document in the database.
    reviews: [
        {
            type: Schema.Types.ObjectId, 
            ref: "Review"
        }
    ], 
    //This field will be an array of user IDs referencing User documents. 
    usersWishlist: [
        {
            type: Schema.Types.ObjectId,
            ref: "User"
        }
    ]
});

// Trigger this function if user delete a hotel. 
// Then, delete any hotel with associated reviews. 
hotelSchema.post("findOneAndDelete", async function(doc) {
    // we can see what document has been deleted. 
    // console.log(doc);  

    if (doc) {
        // remove() is a deprecated function, its use will be dropped in the future, so it's recommended to use the most recent options, like deleteOne() or deleteMany(). 
        await Review.deleteMany({
            _id: {
                $in: doc.reviews 
            }
        })
    }


})


const Hotel = mongoose.model('Hotel', hotelSchema); 
module.exports = Hotel;  

