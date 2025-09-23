import { Router, Request, Response, NextFunction } from 'express';
import passport from '../config/passport';

const router = Router();

// Initiate Google OAuth
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// Google OAuth callback
// router.get('/google/callback',
//   passport.authenticate('google', { failureRedirect: '/login' }),
//   (req: Request, res: Response) => {
//     const user = req.user as IUser;
    
//     // Generate JWT token
//     const token = jwt.sign(
//       { 
//         userId: user._id.toString(),
//         email: user.email 
//       },
//       process.env.JWT_SECRET as string,
//       { expiresIn: process.env.JWT_EXPIRE_IN || '7d' }
//     );

//     // Set token as cookie (optional)
//     res.cookie('token', token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
//     });

//     // Redirect to frontend with token
//     // You can customize this redirect URL based on your frontend setup
//     const redirectUrl = process.env.CLIENT_URL || 'http://localhost:3000';
//     res.redirect(`${redirectUrl}/dashboard?token=${token}`);
//   }
// );

// Logout
router.post('/logout', (req: Request, res: Response, next: NextFunction) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    res.clearCookie('token');
    res.status(200).json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
  });
});

export default router;