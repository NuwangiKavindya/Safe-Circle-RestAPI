require('dotenv').config();
const express = require('express');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();

// 1. Session Middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'a_random_secure_secret_key',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

// 2. Configure Passport Google Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL || 'http://localhost:5001/auth/google/callback'
  },
  (accessToken, refreshToken, profile, done) => {
    // Here you would typically find or create a user in your database
    // e.g., User.findOrCreate({ googleId: profile.id }, ...)
    return done(null, profile);
  }
));

passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((obj, done) => done(null, obj));

// 3. Define Routes
app.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    res.send(`
      <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h1 style="color: #10B981;">Authentication Successful!</h1>
        <h2>Hello, ${req.user.displayName}!</h2>
        <p>Email: ${req.user.emails && req.user.emails[0] ? req.user.emails[0].value : 'N/A'}</p>
        <a href="/logout" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #EF4444; color: white; border-radius: 8px; text-decoration: none; font-weight: bold;">Logout</a>
      </div>
    `);
  } else {
    res.send(`
      <div style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
        <h1>Home - SafeCircle SSO</h1>
        <p>Log in with your Google Account to access the application.</p>
        <a href="/auth/google" style="display: inline-block; margin-top: 20px; padding: 12px 24px; background-color: #4285F4; color: white; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 16px;">Login with Google</a>
      </div>
    `);
  }
});

// Initiate Google Authentication
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

// Google Auth Callback
app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    res.redirect('/');
  }
);

// Logout
app.get('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect('/');
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
