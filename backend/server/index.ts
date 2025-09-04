import { configDotenv } from 'dotenv';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from './lib/passport';
import router from './routes';

configDotenv();
const app = express();
const PORT = parseInt(process.env.PORT || '3001');

// Session configuration for passport
app.use(session({
    secret: process.env.SESSION_SECRET || 'your-session-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Initialize passport
app.use(passport.initialize());
app.use(passport.session());

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? process.env.FRONTEND_URL 
        : 'http://localhost:3000', // Next.js default port
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/api/v1/', router);

app.listen(PORT, '0.0.0.0', () => {
    console.log(`server is running at http://0.0.0.0:${PORT}/`)
});
 