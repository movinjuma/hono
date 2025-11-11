import { Hono } from 'hono';

// Core auth routes
import login from './login.js';
import register from './register.js';
import currentUser from './current-user.js';
import logout from './logout.js';
import logoutAll from './logout-all.js';
import forgotPassword from './forgot-password.js';
import resetPassword from './reset-password.js';
import upgrade from './upgrade.js';
import profile from './profile.js';

// Favorites feature
import postFavorite from './favorites/post.js';
import deleteFavorite from './favorites/delete.js';
import getFavorites from './favorites/get.js';

const authRouter = new Hono();

// Authentication and user management
authRouter.post('/login', login);
authRouter.post('/register', register);
authRouter.get('/current-user', currentUser);
authRouter.post('/logout', logout);
authRouter.post('/logout-all', logoutAll);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.put('/upgrade', upgrade);
authRouter.get('/profile', profile);

// Favorites endpoints
authRouter.post('/favorites', postFavorite);       // Add favorite
authRouter.delete('/favorites', deleteFavorite);   // Remove favorite
authRouter.get('/favorites', getFavorites);        // List favorites

export default authRouter;
