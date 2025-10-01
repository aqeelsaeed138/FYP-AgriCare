import { ApiErrors } from "../utils/ApiErrors.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import Farmer from "../models/farmer.models.js"
import crypto from "crypto"
import nodemailer from "nodemailer"

const generateAccessAndRefreshToken = async (_id) => {
    const farmer = await Farmer.findById(_id)
    if (!farmer) {
        throw new ApiErrors(500, "Error occur in generating tokens")
    }
    const refreshToken = await farmer.generateRefreshToken()
    const accessToken = await farmer.generateAccessToken()
    farmer.refreshToken = refreshToken
    await farmer.save({validateBeforeSave: false})

    return { accessToken, refreshToken }
}

const registerFarmer = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiErrors(400, "Request body is required..")
    }

    const {name, phone, email, location, marketplace} = req.body

    if (!name?.trim() || !phone?.trim()) {
        throw new ApiErrors(400, "Name and phone are required to register new farmer")
    }

    const alreadyExistedFarmer = await Farmer.findOne({phone})

    if (alreadyExistedFarmer) {
        throw new ApiErrors(400, "This Farmer is already registered. Please login")
    }

    const farmer = await Farmer.create({
        name,
        phone,
        email,
        location,
        marketplace
    })

    const createdFarmer = await Farmer.findById(farmer._id)

    if (!createdFarmer) {
        throw new ApiErrors(500, "Farmer can't registered. Some internal server error occur")
    }

    return res.status(201)
    .json(
        new ApiResponse(201, createdFarmer.getPublicProfile(), "Registered new Farmer")
    )
})

const loginFarmer = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiErrors(400, "Request body is required..")
    }

    const {phone} = req.body

    if (!phone?.trim()) {
        throw new ApiErrors(400, "Phone number is required")
    }

    const existedFarmer = await Farmer.findOne({phone})

    if (!existedFarmer) {
        throw new ApiErrors(400, "This Farmer is not registered.. First register this farmer")
    }

    const { accessToken, refreshToken} = await generateAccessAndRefreshToken(existedFarmer._id)

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
        new ApiResponse(200, {
            farmer: existedFarmer.getPublicProfile(),
            accessToken,
            refreshToken
        }, "Farmer login successfully")
    )
})

const logoutFarmer = asyncHandler(async (req, res) => {
    await Farmer.findByIdAndUpdate(req.farmer?._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }
    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(
        new ApiResponse(200, {}, "Farmer logout successfully")
    )
})

const refreshAccessToken = asyncHandler(async (req, res) => {
    const token = req.cookies?.refreshToken || req.params.refreshToken || "";
    if (token === "") {
        throw new ApiErrors(400, "Error occurs in fetching refresh token from your request")
    }
    const decodeToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

    const farmer = await Farmer.findById(decodeToken._id)
    if (!farmer) {
        throw new ApiErrors(400, "Your refresh token is expired or invalid")
    }
    if (farmer.refreshToken !== token) {
        throw new ApiErrors(400, "Your refresh token is used or expired")
    }
    const { accessToken, refreshToken} = await generateAccessAndRefreshToken(farmer._id)
    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
       new ApiResponse(201, { accessToken, refreshToken}, "New access token is assigned")
    )
})

const updateFarmerProfile = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiErrors(400, "Request body is required")
    }

    const {name, email, location} = req.body
    const updateData = {}

    if (name?.trim()) updateData.name = name
    if (email?.trim()) updateData.email = email
    if (location) updateData.location = location

    if (Object.keys(updateData).length === 0) {
        throw new ApiErrors(400, "At least one field is required to update")
    }

    // Check if email is being updated and already exists
    if (email) {
        const existingFarmer = await Farmer.findOne({ email })
        if (existingFarmer) {
            throw new ApiErrors(400, "Email is already in use")
        }
    }

    const updatedFarmer = await Farmer.findByIdAndUpdate(
        req.farmer._id,
        updateData,
        { new: true }
    )

    if (!updatedFarmer) {
        throw new ApiErrors(500, "Failed to update farmer profile")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, updatedFarmer.getPublicProfile(), "Farmer profile updated successfully")
    )
})

const getFarmerProfile = asyncHandler(async (req, res) => {
    const farmer = await Farmer.findById(req.farmer._id)
    
    if (!farmer) {
        throw new ApiErrors(404, "Farmer not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, farmer.getPublicProfile(), "Farmer profile fetched successfully")
    )
})

const updateMarketplace = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiErrors(400, "Request body is required")
    }

    const {isSeller, shopName, contactInfo} = req.body

    const updateData = {
        "marketplace.isSeller": isSeller || false
    }

    if (shopName?.trim()) {
        updateData["marketplace.shopName"] = shopName
    }

    if (contactInfo) {
        if (contactInfo.phone?.trim()) {
            updateData["marketplace.contactInfo.phone"] = contactInfo.phone
        }
        if (contactInfo.email?.trim()) {
            updateData["marketplace.contactInfo.email"] = contactInfo.email
        }
    }

    const updatedFarmer = await Farmer.findByIdAndUpdate(
        req.farmer._id,
        updateData,
        { new: true }
    )

    if (!updatedFarmer) {
        throw new ApiErrors(500, "Failed to update marketplace settings")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, updatedFarmer.getPublicProfile(), "Marketplace settings updated successfully")
    )
})

const addProduct = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiErrors(400, "Request body is required")
    }

    const {name, category, price, description, images} = req.body

    if (!name?.trim() || !price) {
        throw new ApiErrors(400, "Product name and price are required")
    }

    if (price <= 0) {
        throw new ApiErrors(400, "Price must be greater than 0")
    }

    const farmer = await Farmer.findById(req.farmer._id)
    if (!farmer) {
        throw new ApiErrors(404, "Farmer not found")
    }

    if (!farmer.marketplace?.isSeller) {
        throw new ApiErrors(400, "You need to enable seller mode first")
    }

    const newProduct = {
        name,
        category,
        price,
        description,
        images: images || []
    }

    farmer.marketplace.products.push(newProduct)
    await farmer.save()

    const addedProduct = farmer.marketplace.products[farmer.marketplace.products.length - 1]

    return res.status(201)
    .json(
        new ApiResponse(201, addedProduct, "Product added successfully")
    )
})

const updateProduct = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiErrors(400, "Request body is required")
    }

    const {productId} = req.params
    const {name, category, price, description, images} = req.body

    if (!productId) {
        throw new ApiErrors(400, "Product ID is required")
    }

    const farmer = await Farmer.findById(req.farmer._id)
    if (!farmer) {
        throw new ApiErrors(404, "Farmer not found")
    }

    const product = farmer.marketplace.products.id(productId)
    if (!product) {
        throw new ApiErrors(404, "Product not found")
    }

    if (name?.trim()) product.name = name
    if (category?.trim()) product.category = category
    if (price && price > 0) product.price = price
    if (description?.trim()) product.description = description
    if (images) product.images = images

    await farmer.save()

    return res.status(200)
    .json(
        new ApiResponse(200, product, "Product updated successfully")
    )
})

const deleteProduct = asyncHandler(async (req, res) => {
    const {productId} = req.params

    if (!productId) {
        throw new ApiErrors(400, "Product ID is required")
    }

    const farmer = await Farmer.findById(req.farmer._id)
    if (!farmer) {
        throw new ApiErrors(404, "Farmer not found")
    }

    const productIndex = farmer.marketplace.products.findIndex(
        product => product._id.toString() === productId
    )

    if (productIndex === -1) {
        throw new ApiErrors(404, "Product not found")
    }

    farmer.marketplace.products.splice(productIndex, 1)
    await farmer.save()

    return res.status(200)
    .json(
        new ApiResponse(200, {}, "Product deleted successfully")
    )
})

const getFarmerProducts = asyncHandler(async (req, res) => {
    const farmer = await Farmer.findById(req.farmer._id)
    if (!farmer) {
        throw new ApiErrors(404, "Farmer not found")
    }

    const products = farmer.marketplace?.products || []

    return res.status(200)
    .json(
        new ApiResponse(200, products, "Farmer products fetched successfully")
    )
})

const getAllSellers = asyncHandler(async (req, res) => {
    const {page = 1, limit = 10, search = ""} = req.query

    const query = {
        "marketplace.isSeller": true
    }

    if (search) {
        query.$or = [
            { name: { $regex: search, $options: "i" } },
            { "marketplace.shopName": { $regex: search, $options: "i" } }
        ]
    }

    const sellers = await Farmer.find(query)
        .select("name phone email location marketplace.shopName marketplace.contactInfo")
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .sort({ createdAt: -1 })

    const total = await Farmer.countDocuments(query)

    return res.status(200)
    .json(
        new ApiResponse(200, {
            sellers,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            total
        }, "Sellers fetched successfully")
    )
})

const getSellerProducts = asyncHandler(async (req, res) => {
    const {sellerId} = req.params
    const {page = 1, limit = 10, category} = req.query

    if (!sellerId) {
        throw new ApiErrors(400, "Seller ID is required")
    }

    const seller = await Farmer.findOne({
        _id: sellerId,
        "marketplace.isSeller": true
    })

    if (!seller) {
        throw new ApiErrors(404, "Seller not found")
    }

    let products = seller.marketplace?.products || []

    if (category) {
        products = products.filter(product => 
            product.category?.toLowerCase().includes(category.toLowerCase())
        )
    }

    const startIndex = (page - 1) * limit
    const endIndex = startIndex + parseInt(limit)
    const paginatedProducts = products.slice(startIndex, endIndex)

    return res.status(200)
    .json(
        new ApiResponse(200, {
            seller: seller.getPublicProfile(),
            products: paginatedProducts,
            totalPages: Math.ceil(products.length / limit),
            currentPage: parseInt(page),
            total: products.length
        }, "Seller products fetched successfully")
    )
})

const changePassword = asyncHandler( async (req, res) => {

    if (!req.body) {
        throw new ApiErrors(400, "Request body is required")
    }
    const { workEmail } = req.body
    if (!workEmail) {
    throw new ApiErrors(400, "Email is required")
    }
    const user = await User.findOne({workEmail})
    if (!user) {
        return res.status(200)
        .json(
        new ApiResponse(200, {}, "If email exists, reset link has been sent")
        )
    }

    try {
        const resetToken = crypto.randomBytes(32).toString('hex')
        const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
        user.passwordResetToken = resetTokenHash
        user.passwordResetExpires = Date.now() + (15 * 60 * 1000)  // 15 mints
        await user.save()

        const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${resetToken}`
        await sendPasswordResetEmail(workEmail, resetUrl)

        return res.status(200)
        .json(
            new ApiResponse(200, {}, "If email exists, reset link has been sent")
        )
    } catch (error) {
        user.passwordResetToken = undefined
        user.passwordResetExpires = undefined
        await user.save()
        throw new ApiErrors(500, error.message || "Failed to send password reset email", error)
    }
})

const sendPasswordResetEmail = async (email, resetURL) => {
    
    // Create email transporter (using Gmail)
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        secure: true,
        auth: {
            user: process.env.MY_Gmail, 
            pass: process.env.GMAIL_PASS  
        }
    })
    
    // Email content
    const receiver = {
        from: `"${process.env.COMPANY_NAME}" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Password Reset Request - Inventory System',
        html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="text-align: center; margin-bottom: 30px;">
                    <h1 style="color: #333;">${process.env.COMPANY_NAME || 'Inventory System'}</h1>
                </div>
                
                <h2 style="color: #333;">Password Reset Request</h2>
                
                <p>Hello,</p>
                <p>You are receiving this email because a password reset was requested for your work email account.</p>
                
                <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
                    <p><strong>Account:</strong> ${email}</p>
                </div>
                
                <p>Please click the button below to reset your password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${resetURL}" 
                       style="background-color: #007bff; color: white; padding: 15px 30px; 
                              text-decoration: none; border-radius: 5px; display: inline-block;
                              font-weight: bold;">
                        Reset My Password
                    </a>
                </div>
                
                <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; 
                           border-radius: 5px; margin: 20px 0;">
                    <p style="margin: 0;"><strong>⚠️ Important:</strong></p>
                    <ul style="margin: 5px 0;">
                        <li>This link will expire in <strong>15 minutes</strong></li>
                        <li>The link can only be used once</li>
                        <li>If you didn't request this, please ignore this email</li>
                    </ul>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #666; font-size: 14px;">${resetURL}</p>
                
                <hr style="margin: 30px 0;">
                <p style="color: #666; font-size: 12px; text-align: center;">
                    This is an automated email from ${process.env.COMPANY_NAME || 'Inventory Management System'}
                </p>
            </div>
        `
    }
    
    // Send email
    await transporter.sendMail(receiver)
}

const resetPassword = asyncHandler(async (req, res) => {
    const { token } = req.params // from URL: /reset-password/abc123xyz
    const { newPassword, confirmPassword } = req.body
    
    if (!newPassword || !confirmPassword) {
        throw new ApiErrors(400, "New password and confirm password are required")
    }
    
    if (newPassword !== confirmPassword) {
        throw new ApiErrors(400, "Passwords do not match")
    }
    
    if (newPassword.length < 6) {
        throw new ApiErrors(400, "Password must be at least 6 characters long")
    }
    
    // Hash the token to match what's stored in database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex')
    
    const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() } // Token not expired
    })
    
    if (!user) {
        throw new ApiErrors(400, "Password reset token is invalid or has expired")
    }
    
    user.password = newPassword
    user.passwordResetToken = undefined
    user.passwordResetExpires = undefined
    user.refreshToken = undefined
    await user.save()
    
    res.status(200).json(
        new ApiResponse(200, {}, "Password has been reset successfully. Please login with your new password.")
    )
})


export { 
    registerFarmer, 
    loginFarmer, 
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
    changePassword,
    resetPassword
}