const cloudinary = require('cloudinary').v2;
//A multer storage engine for Cloudinary.
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUNDINARY_KEY,
    api_secret: process.env.COUNDINARY_SECRET
}); 

const storage = new CloudinaryStorage({
    cloudinary, 
    params: {
        folder: 'Hotel-Rating-System',
        allowedFormats: ['jpeg', 'png', 'jpg']
    }
}); 


module.exports = {
    cloudinary, 
    storage
}
