// config/passport.js

import dotenv from "dotenv";
dotenv.config(); // Must load .env before passport config

import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import User from "../models/userModel.js";

const trimSlash = (url = "") => String(url || "").replace(/\/+$/, "");
const serverBase =
  trimSlash(process.env.SERVER_URL) ||
  trimSlash(process.env.RENDER_EXTERNAL_URL) ||
  "http://localhost:5000";
const callbackUrl =
  trimSlash(process.env.GOOGLE_CALLBACK_URL) || `${serverBase}/api/auth/google/callback`;

const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = process.env;

if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
  console.warn("Google OAuth DISABLED: missing GOOGLE_CLIENT_ID/GOOGLE_CLIENT_SECRET");
} else {
  console.log("Google OAuth enabled");
  console.log("Google callback URL:", callbackUrl);

  passport.use(
    new GoogleStrategy(
      {
        clientID: GOOGLE_CLIENT_ID,
        clientSecret: GOOGLE_CLIENT_SECRET,
        callbackURL: callbackUrl,
      },
      async (_accessToken, _refreshToken, profile, done) => {
        try {
          const email = profile.emails?.[0]?.value?.toLowerCase();
          const avatar = profile.photos?.[0]?.value;
          let user = await User.findOne({ $or: [{ googleId: profile.id }, { email }] });

          if (!user) {
            user = await User.create({
              name: profile.displayName,
              email,
              googleId: profile.id,
              avatar,
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            if (avatar && !user.avatar) user.avatar = avatar;
            await user.save();
          }

          done(null, user);
        } catch (err) {
          done(err);
        }
      }
    )
  );
}

export default passport;
