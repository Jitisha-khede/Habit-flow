const express = require('express');
const router = express.Router();
const passport = require('passport');
const { register, login, getCurrentUser, googleAuthSuccess, googleAuthFailure } = require('../controllers/authController');
const auth = require('../middleware/auth');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Get current logged in user
// @access  Private
router.get('/me', auth, getCurrentUser);

// @route   GET /api/auth/google
// @desc    Authenticate with Google
// @access  Public
router.get('/google', 
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// @route   GET /api/auth/google/callback
// @desc    Google auth callback
// @access  Public
router.get('/google/callback',
  passport.authenticate('google', { failureRedirect: '/auth/google/failure' }),
  googleAuthSuccess
);

// @route   GET /api/auth/google/failure
// @desc    Google auth failure
// @access  Public
router.get('/google/failure', googleAuthFailure);

module.exports = router;
