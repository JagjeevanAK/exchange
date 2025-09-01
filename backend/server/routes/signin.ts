import bcrypt from "bcryptjs";
import { configDotenv } from "dotenv";
import { Router } from "express";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prsimaClient";

configDotenv();

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || "jwt-key"

router.post('/signin', async (req, res) => {
    
    try{
        const { email, password } = req.body;

        if( !email || !password ){
            return res.send(401).json({
                message: "Eamil and Password are required"
            });
        }

        const dbData = await prisma.user.findUnique({
            where: {email}
        });

        const isMatch = await bcrypt.compare(password, dbData.password);

        if(!isMatch){
            return res.status(403).json({
                message: "Incorrect credentials"
            });
        }

        const jwtToken = await jwt.sign({
            userId: dbData.id,
            email: dbData.email
        },
        JWT_SECRET,{
            expiresIn:'1h'
        });
        
        res.status(200).json({
            token: jwtToken
        });
    } catch(e){
        console.error("Signin error: ", e);
        res.status(500).json({
            message:"Internal server issue"
        });
    }
});

export default router;