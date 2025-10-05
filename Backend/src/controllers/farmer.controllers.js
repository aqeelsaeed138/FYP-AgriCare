import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { Farmer } from "../models/farmer.model.js"

const generateAccessAndRefreshToken = async (_id) => {
    const farmer = await Farmer.findById(_id)
    if (!farmer) {
        throw new ApiError(500, "Error occur in generating tokens")
    }
    const refreshToken = await farmer.generateRefreshToken()
    const accessToken = await farmer.generateAccessToken()
    farmer.refreshToken = refreshToken
    await farmer.save({validateBeforeSave: false})

    return { accessToken, refreshToken }
}

const registerFarmer = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is required..")
    }

    const {name, phone, email, location, marketplace} = req.body

    if (!name?.trim() || !phone?.trim()) {
        throw new ApiError(400, "Name and phone are required to register new farmer")
    }

    const alreadyExistedFarmer = await Farmer.findOne({phone})

    if (alreadyExistedFarmer) {
        throw new ApiError(400, "This Farmer is already registered. Please login")
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
        throw new ApiError(500, "Farmer can't registered. Some internal server error occur")
    }

    const { accessToken, refreshToken} = await generateAccessAndRefreshToken(createdFarmer._id)

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
            farmer: createdFarmer.getPublicProfile(),
            accessToken,
            refreshToken
        }, "Farmer Register and login successfully")
    )
})

const loginFarmer = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is required..")
    }

    const {phone} = req.body

    if (!phone?.trim()) {
        throw new ApiError(400, "Phone number is required")
    }

    const existedFarmer = await Farmer.findOne({phone})

    if (!existedFarmer) {
        throw new ApiError(400, "This Farmer is not registered.. First register this farmer")
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
        throw new ApiError(400, "Error occurs in fetching refresh token from your request")
    }
    const decodeToken = jwt.verify(token, process.env.REFRESH_TOKEN_SECRET)

    const farmer = await Farmer.findById(decodeToken._id)
    if (!farmer) {
        throw new ApiError(400, "Your refresh token is expired or invalid")
    }
    if (farmer.refreshToken !== token) {
        throw new ApiError(400, "Your refresh token is used or expired")
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
        throw new ApiError(400, "Request body is required")
    }

    const {name, email, location} = req.body
    const updateData = {}
    const farmerId = req.farmer?._id;

    if (name?.trim()) updateData.name = name
    if (email?.trim()) updateData.email = email
    if (location) updateData.location = location

    if (Object.keys(updateData).length === 0) {
        throw new ApiError(400, "At least one field is required to update")
    }

    // Check if email is being updated and already exists
    if (email) {
        const existingFarmer = await Farmer.findOne({ email, _id: {$ne: farmerId} })
        if (existingFarmer) {
            throw new ApiError(400, "Email is already in use")
        }
    }

    const updatedFarmer = await Farmer.findByIdAndUpdate(
        farmerId,
        updateData,
        { new: true }
    )

    if (!updatedFarmer) {
        throw new ApiError(500, "Failed to update farmer profile")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, updatedFarmer.getPublicProfile(), "Farmer profile updated successfully")
    )
})

const getFarmerProfile = asyncHandler(async (req, res) => {
    const farmer = await Farmer.findById(req.farmer._id)
    
    if (!farmer) {
        throw new ApiError(404, "Farmer not found")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, farmer.getPublicProfile(), "Farmer profile fetched successfully")
    )
})

const updateMarketplace = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is required")
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
        throw new ApiError(500, "Failed to update marketplace settings")
    }

    return res.status(200)
    .json(
        new ApiResponse(200, updatedFarmer.getPublicProfile(), "Marketplace settings updated successfully")
    )
})

const addProduct = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is required")
    }

    const {name, category, price, description, images} = req.body

    if (!name?.trim() || !price) {
        throw new ApiError(400, "Product name and price are required")
    }

    if (price <= 0) {
        throw new ApiError(400, "Price must be greater than 0")
    }

    const farmer = await Farmer.findById(req.farmer._id)
    if (!farmer) {
        throw new ApiError(404, "Farmer not found")
    }

    if (!farmer.marketplace?.isSeller) {
        throw new ApiError(400, "You need to enable seller mode first")
    }
    const productExists = farmer.marketplace.products.some(
        product => product.name.toLowerCase().trim() === name.toLowerCase().trim()
    )

    if (productExists) {
        throw new ApiError(400, "A product with this name already exists in your shop")
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
        throw new ApiError(400, "Request body is required")
    }

    const {productId} = req.params
    const {name, category, price, description, images} = req.body

    if (!productId) {
        throw new ApiError(400, "Product ID is required")
    }

    const farmer = await Farmer.findById(req.farmer._id)
    if (!farmer) {
        throw new ApiError(404, "Farmer not found")
    }

    const product = farmer.marketplace.products._id(productId)
    if (!product) {
        throw new ApiError(404, "Product not found")
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
        throw new ApiError(400, "Product ID is required")
    }

    const farmer = await Farmer.findById(req.farmer._id)
    if (!farmer) {
        throw new ApiError(404, "Farmer not found")
    }

    const productIndex = farmer.marketplace.products.findIndex(
        product => product._id.toString() === productId
    )

    if (productIndex === -1) {
        throw new ApiError(404, "Product not found")
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
        throw new ApiError(404, "Farmer not found")
    }

    const products = farmer.marketplace?.products || []

    return res.status(200)
    .json(
        new ApiResponse(200, products, "Farmer products fetched successfully")
    )
})

const getAllSellers = asyncHandler(async (req, res) => {
    const {page = 1, limit = 10} = req.query

    const query = {
        "marketplace.isSeller": true
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
    const {page = 1, limit = 10, category} = req.query

    // Use authenticated farmer's ID
    const seller = await Farmer.findOne({
        _id: req.farmer._id,
        "marketplace.isSeller": true
    })

    if (!seller) {
        throw new ApiError(404, "Seller not found or seller mode is not enabled")
    }

    let products = seller.marketplace?.products || []

    // Filter by category if provided
    if (category) {
        products = products.filter(product => 
            product.category?.toLowerCase().includes(category.toLowerCase())
        )
    }

    // Pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + parseInt(limit)
    const paginatedProducts = products.slice(startIndex, endIndex)

    return res.status(200)
    .json(
        new ApiResponse(200, {
            seller: seller.getPublicProfile(),
            products: paginatedProducts,
            pagination: {
                totalProducts: products.length,
                totalPages: Math.ceil(products.length / limit),
                currentPage: parseInt(page),
                limit: parseInt(limit),
                hasNextPage: endIndex < products.length,
                hasPrevPage: page > 1
            }
        }, "Seller products fetched successfully")
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
}