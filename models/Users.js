const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

     name : {
        type:String,
        trim:true,
        required : [true,"Name is Required"],
     },

     email:{
        type:String,
        required :[true,"Email is Required"],
        trim:true,
        unique:true,
        lowercase:true
     },

     
     phone:{
      type:String,
      required:[true,"Phone is Required"],
      trim:true
     },
     
     password:{
        type:String,
        required : false,
        minlength:[6, "Password must be at least 6 characters"],
        trim:true,

     },

     role:{
        type : String,
        enum : ["user","admin"],
        default : "user"
     },

     tokens:{
      type:Number,
      default:2
     }
     
    },{timestamps:true});


module.exports = mongoose.model("User",userSchema)