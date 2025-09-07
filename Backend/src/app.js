import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express()

const corsOptions = {
    origin: process.env.ORIGIN_URI,
    optionsSuccessStatus: 200
}

app.use(cors(corsOptions))


app.use(express.json({limit: "16kb"}));
app.use(express.urlencoded({extended:true, limit: "16kb"}));
app.use(cookieParser());
app.use(express.static('public'));


export { app }