// Import mongo schema. 
const { response } = require("express");
const Hotel = require("../models/hotel"); 


// getting-started.js
const mongoose = require('mongoose');
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://127.0.0.1:27017/hotel-rating-system').then(() => {
    console.log("Database connected !!!")
  })
}

const seedDB = async() => {
  // Get api data from Google Map API.
const axios = require('axios');

try {
    const params = {
        location: '47.608013, -122.335167',
        radius: '5000',
        type: 'hotel',
        key: 'AIzaSyBZAdBZuh2bgL823ekoZsvoo7Nt7XuZXKY'
      };

      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?${new URLSearchParams(params)}`;
    

    axios.get(url)
        .then(response => {
            const allHotels = response.data.results;
            for (let hotel of allHotels) {
                console.log(hotel)
            }
            console.log(`Number of all hotels is ${allHotels.length}`)
            // console.log(response.data.results)
        });

     
    const h = {
        title: `${hotel.name}`, 
        location: `${hotel}`, 
        price: 250, 
        description: 'Welcome !!!', 
        images: [
            {
              path: 'https://res.cloudinary.com/dep2h8x8y/image/upload/v1693927072/Hotel-Rating-System/agqwnlvnzack5nkb7lld.jpg',
              filename: 'Hotel-Rating-System/agqwnlvnzack5nkb7lld',
              _id: new ObjectId("64f746a1d7a33d2ae4489a60")
            }
          ], 
        author: '64f746a1d7a33d2ae4489a5f'
    }

} catch (error) {
	console.error(error);
}

}


seedDB(); 





