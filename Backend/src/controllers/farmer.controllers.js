import { ApiError } from "../utils/ApiError.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import { Farmer } from "../models/farmer.model.js"
import nodemailer from "nodemailer"
import Twilio from "twilio/lib/rest/Twilio.js"

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
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});

// Store OTPs temporarily (in production, use Redis or similar)
const otpStore = new Map();

// Generate 4-digit OTP
const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
};

// Send OTP via SMS (integrate with SMS provider like Twilio, MSG91, etc.)
const sendSMSOTP = async (phone, otp) => {
    try {
        const accountSid = process.env.TWILIO_ACCOUNT_SID;
        const authToken = process.env.TWILIO_AUTH_TOKEN;
        const client = Twilio(accountSid, authToken);
        
        const message = await client.messages.create({
            body: `Your AgriCare verification code is: ${otp}. Valid for 10 minutes.`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: phone // Format: +923001234567
        });
        
        console.log(`SMS sent successfully. SID: ${message.sid}`);
        return true;
    } catch (error) {
        console.error('Twilio SMS Error:', error);
        throw new Error('Failed to send SMS');
    }
};

// Send OTP via Email
const sendEmailOTP = async (email, otp) => {
    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'AgriCare - Email Verification Code',
        html: `
            <div style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>AgriCare Email Verification</h2>
                <p>Your verification code is:</p>
                <h1 style="color: #4CAF50; letter-spacing: 5px;">${otp}</h1>
                <p>This code will expire in 10 minutes.</p>
                <p>If you didn't request this code, please ignore this email.</p>
            </div>
        `
    };

    await transporter.sendMail(mailOptions);
    return true;
};

// Step 1: Request OTP for Registration
const requestRegistrationOTP = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is required");
    }

    const { name, phone, email, location, marketplace } = req.body;

    if (!name?.trim()) {
        throw new ApiError(400, "Name is required");
    }

    if (!phone?.trim() && !email?.trim()) {
        throw new ApiError(400, "Either phone number or email is required");
    }

    // Check if farmer already exists
    let existingFarmer;
    if (phone) {
        existingFarmer = await Farmer.findOne({ phone });
    } else if (email) {
        existingFarmer = await Farmer.findOne({ email });
    }

    if (existingFarmer) {
        throw new ApiError(400, "This farmer is already registered. Please login");
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP with user data
    const identifier = phone || email;
    otpStore.set(identifier, {
        otp,
        otpExpiry,
        userData: { name, phone, email, location, marketplace },
        type: 'registration'
    });

    // Send OTP
    try {
        if (phone) {
            await sendSMSOTP(phone, otp);
        } else {
            await sendEmailOTP(email, otp);
        }

        return res.status(200).json(
            new ApiResponse(200, {
                identifier,
                message: phone 
                    ? "OTP sent to your phone number" 
                    : "OTP sent to your email"
            }, "OTP sent successfully")
        );
    } catch (error) {
        otpStore.delete(identifier);
        throw new ApiError(500, "Failed to send OTP. Please try again");
    }
});

// Step 2: Verify OTP and Complete Registration
const verifyOTPAndRegister = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is required");
    }

    const { identifier, otp } = req.body;

    if (!identifier?.trim() || !otp?.trim()) {
        throw new ApiError(400, "Identifier and OTP are required");
    }

    // Retrieve stored OTP data
    const storedData = otpStore.get(identifier);

    if (!storedData) {
        throw new ApiError(400, "OTP expired or invalid. Please request a new OTP");
    }

    // Check if OTP is expired
    if (Date.now() > storedData.otpExpiry) {
        otpStore.delete(identifier);
        throw new ApiError(400, "OTP has expired. Please request a new OTP");
    }

    // Verify OTP
    if (storedData.otp !== otp) {
        throw new ApiError(400, "Invalid OTP. Please try again");
    }

    // Check type
    if (storedData.type !== 'registration') {
        throw new ApiError(400, "Invalid OTP type");
    }

    // Create farmer
    const { name, phone, email, location, marketplace } = storedData.userData;

    const farmer = await Farmer.create({
        name,
        phone,
        email,
        location,
        marketplace,
        isVerified: true
    });

    const createdFarmer = await Farmer.findById(farmer._id);

    if (!createdFarmer) {
        throw new ApiError(500, "Farmer registration failed. Please try again");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(createdFarmer._id);

    const options = {
        httpOnly: true,
        secure: true
    };

    // Clear OTP from store
    otpStore.delete(identifier);

    return res
        .status(201)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(201, {
                farmer: createdFarmer.getPublicProfile(),
                accessToken,
                refreshToken
            }, "Farmer registered and logged in successfully")
        );
});

// Step 1: Request OTP for Login
const requestLoginOTP = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is required");
    }

    const { identifier } = req.body; // Can be phone or email

    if (!identifier?.trim()) {
        throw new ApiError(400, "Phone number or email is required");
    }

    // Find farmer by phone or email
    const existedFarmer = await Farmer.findOne({
        $or: [{ phone: identifier }, { email: identifier }]
    });

    if (!existedFarmer) {
        throw new ApiError(400, "Farmer not found. Please register first");
    }

    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Store OTP
    otpStore.set(identifier, {
        otp,
        otpExpiry,
        farmerId: existedFarmer._id,
        type: 'login'
    });

    // Send OTP
    try {
        if (existedFarmer.phone === identifier) {
            await sendSMSOTP(identifier, otp);
        } else {
            await sendEmailOTP(identifier, otp);
        }

        return res.status(200).json(
            new ApiResponse(200, {
                identifier,
                message: existedFarmer.phone === identifier
                    ? "OTP sent to your phone number"
                    : "OTP sent to your email"
            }, "OTP sent successfully")
        );
    } catch (error) {
        otpStore.delete(identifier);
        throw new ApiError(500, "Failed to send OTP. Please try again");
    }
});

// Step 2: Verify OTP and Login
const verifyOTPAndLogin = asyncHandler(async (req, res) => {
    if (!req.body) {
        throw new ApiError(400, "Request body is required");
    }

    const { identifier, otp } = req.body;

    if (!identifier?.trim() || !otp?.trim()) {
        throw new ApiError(400, "Identifier and OTP are required");
    }

    // Retrieve stored OTP data
    const storedData = otpStore.get(identifier);

    if (!storedData) {
        throw new ApiError(400, "OTP expired or invalid. Please request a new OTP");
    }

    // Check if OTP is expired
    if (Date.now() > storedData.otpExpiry) {
        otpStore.delete(identifier);
        throw new ApiError(400, "OTP has expired. Please request a new OTP");
    }

    // Verify OTP
    if (storedData.otp !== otp) {
        throw new ApiError(400, "Invalid OTP. Please try again");
    }

    // Check type
    if (storedData.type !== 'login') {
        throw new ApiError(400, "Invalid OTP type");
    }

    // Get farmer
    const existedFarmer = await Farmer.findById(storedData.farmerId);

    if (!existedFarmer) {
        throw new ApiError(400, "Farmer not found");
    }

    // Generate tokens
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(existedFarmer._id);

    const options = {
        httpOnly: true,
        secure: true
    };

    // Clear OTP from store
    otpStore.delete(identifier);

    return res
        .status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", refreshToken, options)
        .json(
            new ApiResponse(200, {
                farmer: existedFarmer.getPublicProfile(),
                accessToken,
                refreshToken
            }, "Farmer logged in successfully")
        );
});

const logoutFarmer = asyncHandler(async (req, res) => {
    await Farmer.findByIdAndUpdate(
        req.farmer?._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    );

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .clearCookie("accessToken", options)
        .clearCookie("refreshToken", options)
        .json(
            new ApiResponse(200, {}, "Farmer logged out successfully")
        );
});

// const registerFarmer = asyncHandler(async (req, res) => {
//     if (!req.body) {
//         throw new ApiError(400, "Request body is required..")
//     }

//     const {name, phone, email, location, marketplace} = req.body

//     if (!name?.trim() || !phone?.trim()) {
//         throw new ApiError(400, "Name and phone are required to register new farmer")
//     }

//     const alreadyExistedFarmer = await Farmer.findOne({phone})

//     if (alreadyExistedFarmer) {
//         throw new ApiError(400, "This Farmer is already registered. Please login")
//     }

//     const farmer = await Farmer.create({
//         name,
//         phone,
//         email,
//         location,
//         marketplace
//     })

//     const createdFarmer = await Farmer.findById(farmer._id)

//     if (!createdFarmer) {
//         throw new ApiError(500, "Farmer can't registered. Some internal server error occur")
//     }

//     const { accessToken, refreshToken} = await generateAccessAndRefreshToken(createdFarmer._id)

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res
//     .status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(
//         new ApiResponse(200, {
//             farmer: createdFarmer.getPublicProfile(),
//             accessToken,
//             refreshToken
//         }, "Farmer Register and login successfully")
//     )
// })

// const loginFarmer = asyncHandler(async (req, res) => {
//     if (!req.body) {
//         throw new ApiError(400, "Request body is required..")
//     }

//     const {phone} = req.body

//     if (!phone?.trim()) {
//         throw new ApiError(400, "Phone number is required")
//     }

//     const existedFarmer = await Farmer.findOne({phone})

//     if (!existedFarmer) {
//         throw new ApiError(400, "This Farmer is not registered.. First register this farmer")
//     }

//     const { accessToken, refreshToken} = await generateAccessAndRefreshToken(existedFarmer._id)

//     const options = {
//         httpOnly: true,
//         secure: true
//     }

//     return res
//     .status(200)
//     .cookie("accessToken", accessToken, options)
//     .cookie("refreshToken", refreshToken, options)
//     .json(
//         new ApiResponse(200, {
//             farmer: existedFarmer.getPublicProfile(),
//             accessToken,
//             refreshToken
//         }, "Farmer login successfully")
//     )
// })

// const logoutFarmer = asyncHandler(async (req, res) => {
//     await Farmer.findByIdAndUpdate(req.farmer?._id,
//         {
//             $set: {
//                 refreshToken: undefined
//             }
//         },
//         {
//             new: true
//         }
//     )

//     const options = {
//         httpOnly: true,
//         secure: true
//     }
//     return res.status(200)
//     .clearCookie("accessToken", options)
//     .clearCookie("refreshToken", options)
//     .json(
//         new ApiResponse(200, {}, "Farmer logout successfully")
//     )
// })

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
}