import bcrypt from "bcryptjs";
import { Router } from "express";
import { prisma } from '@exchange/db';

const router = Router();

router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password are required"
            });
        }

        const ifExist = await prisma.user.findUnique({
            where: { email }
        });

        if (ifExist) {
            return res.status(403).json({
                message: "Error while signing up: User already exists"
            })
        }

        const hashedPass = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: {
                email,
                password: hashedPass
            }
        });

        res.status(201).json({
            userId: user.id,
            message: "Successfully signed up"
        });
    } catch (e) {
        console.error("signup error: ", e);
        res.status(500).json({
            message: "Internal server error"
        });
    }
});

export default router;