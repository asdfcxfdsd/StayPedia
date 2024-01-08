//This code defines a custom error class called ExpressError that extends the built-in Error class. 
// The ExpressError class has two properties: message and statusCode . The constructor method of the ExpressError class takes two arguments: message and statusCode . 
// It sets the message and statusCode properties of the error object to the values passed as arguments. 
// This custom error class can be used to handle errors in an Express.js application.
// By creating an instance of the ExpressError class and passing in a message and status code, developers can easily handle errors and return appropriate error responses to the client.

class ExpressError extends Error {
    constructor(message, statusCode) {
        super(); 
        this.message = message; 
        this.statusCode = statusCode; 
    }
}

// to export from given file so that other files are allowed to access the exported code. 
module.exports = ExpressError; 

