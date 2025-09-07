import dotenv from "dotenv"
import { app } from "./app.js"
import  connectDB  from "./db/index.js"

dotenv.config({
    path: "./.env"
})

app.on("error",(error)=> 
    console.log("Express App Error", error)
)

connectDB()
.then(()=> {
    app.listen(process.env.PORT || 5000, ()=> {
        console.log("App is listening on the port ", process.env.PORT);
        
    })
})
.catch((err)=> {
    console.log("DB connection failed. Err: ", err);
})


