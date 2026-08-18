const mongoose = require("mongoose");

const dotenv = require("dotenv")

dotenv.config()

const connectDb = async()=>{
    try{
       const con = await mongoose.connect(process.env.MONGO_URI);

       console.log("Database Connected Successfully");

    
    }catch(error){
    
        console.log(`Error:${error.message}`);
    
        process.exit(1);
    }
}

module.exports = connectDb;