import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { User } from '../database/models/User';

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      callbackURL: '/auth/google/callback',
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        // Check if user already exists with this Google ID
        let existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          return done(null, existingUser);
        }

        // Check if user exists with same email (from local registration)
        existingUser = await User.findOne({ email: profile.emails?.[0]?.value });

        // if (existingUser) {
        //   // Link Google account to existing user
        //   existingUser.googleId = profile.id;
        //   existingUser.provider = 'google';
        //   existingUser.isEmailVerified = true;
        //   await existingUser.save();
        //   return done(null, existingUser);
        // }

        // Create new user
        const newUser = await User.create({
          googleId: profile.id,
          email: profile.emails?.[0]?.value,
          name: profile.displayName || profile.name?.givenName || 'Unknown',
          avatarUrl: profile.photos?.[0]?.value,
          provider: 'google',
          isEmailVerified: true,
          gender: 'other', // Default gender, user can update later
        });

        done(null, newUser);
      } catch (error) {
        console.error('Google OAuth Error:', error);
        done(error as Error, false);
      }
    }
  )
);

export default passport;