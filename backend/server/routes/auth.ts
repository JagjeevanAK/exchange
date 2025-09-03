import { Router } from "express";
import passport from "../lib/passport";

const router = Router();

// Google OAuth login route
router.get('/google', 
    passport.authenticate('google', { 
        scope: ['profile', 'email'] 
    })
);

// Google OAuth callback route
router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/signin' }),
    (req, res) => {
        // Successful authentication
        const user = req.user as any;
        if (user && user.token) {
            // Redirect to frontend with token as query parameter
            const redirectUrl = process.env.NODE_ENV === 'production' 
                ? `${process.env.FRONTEND_URL}/auth/callback?token=${user.token}`
                : `http://localhost:3000/auth/callback?token=${user.token}`;
            res.redirect(redirectUrl);
        } else {
            res.redirect('/signin?error=authentication_failed');
        }
    }
);

export default router;
