// this will help us to catch error and pass to next for our async function. 

module.exports = func => {
    return (req, res, next) => {
        func(req, res, next).catch(next); 
    }
}