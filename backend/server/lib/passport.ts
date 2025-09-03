import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../lib/prsimaClient';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || "jwt-key";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    console.warn('Google OAuth credentials not found. Google sign-in will not work.');
}

passport.use(new GoogleStrategy({
    clientID: GOOGLE_CLIENT_ID || '',
    clientSecret: GOOGLE_CLIENT_SECRET || '',
    callbackURL: "/api/v1/auth/google/callback"
}, async (accessToken, refreshToken, profile, done) => {
    try {
        // Check if user already exists
        let user = await prisma.user.findUnique({
            where: { email: profile.emails?.[0]?.value }
        });

        if (!user) {
            // Create new user if doesn't exist
            user = await prisma.user.create({
                data: {
                    email: profile.emails?.[0]?.value || '',
                    password: '', // No password for OAuth users
                    // You might want to add additional fields like name, avatar, etc.
                }
            });
        }

        // Generate JWT token
        const token = jwt.sign({
            userId: user.id,
            email: user.email
        }, JWT_SECRET, {
            expiresIn: '1h'
        });

        return done(null, { user, token });
    } catch (error) {
        return done(error, false);
    }
}));

passport.serializeUser((user: any, done) => {
    done(null, user);
});

passport.deserializeUser((user: any, done) => {
    done(null, user);
});

export default passport;
