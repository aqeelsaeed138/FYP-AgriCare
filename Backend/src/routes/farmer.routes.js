import { Router } from "express"
import {
    requestRegistrationOTP,
    verifyOTPAndRegister,
    requestLoginOTP,
    verifyOTPAndLogin,
    logoutFarmer, 
    refreshAccessToken, 
    updateFarmerProfile,
    getFarmerProfile,
    updateMarketplace,
    addProduct,
    updateProduct,
    deleteProduct,
    getFarmerProducts,
    getAllSellers,
    getSellerProducts,
} from "../controllers/farmer.controllers.js"
import { verifyFarmerJWT } from "../middlewares/auth.middleware.js"

const farmerRouter = Router()

// Authentication Routes - OTP Based
farmerRouter.route("/request-registration-otp").post(requestRegistrationOTP)
farmerRouter.route("/verify-otp-register").post(verifyOTPAndRegister)
farmerRouter.route("/request-login-otp").post(requestLoginOTP)
farmerRouter.route("/verify-otp-login").post(verifyOTPAndLogin)
farmerRouter.route("/logoutFarmer").post(verifyFarmerJWT, logoutFarmer)
farmerRouter.route("/refreshAccessToken").post(refreshAccessToken)

// Profile Routes
farmerRouter.route("/updateFarmerProfile").patch(verifyFarmerJWT, updateFarmerProfile)
farmerRouter.route("/getFarmerProfile").get(verifyFarmerJWT, getFarmerProfile)

// Marketplace Routes
farmerRouter.route("/updateMarketplace").patch(verifyFarmerJWT, updateMarketplace)

// Product Routes
farmerRouter.route("/addProduct").post(verifyFarmerJWT, addProduct)
farmerRouter.route("/updateProduct/:productId").patch(verifyFarmerJWT, updateProduct)
farmerRouter.route("/deleteProduct/:productId").delete(verifyFarmerJWT, deleteProduct)
farmerRouter.route("/getFarmerProducts").get(verifyFarmerJWT, getFarmerProducts)

// Public Routes (No Authentication Required)
farmerRouter.route("/getAllSellers").get(verifyFarmerJWT, getAllSellers)
farmerRouter.route("/getSellerProducts").get(verifyFarmerJWT, getSellerProducts)


export default farmerRouter