const express = require('express');
const router = express.Router();
const User = require('../models/user');
const catchAsyncError = require('../middlewares/catchAsyncErrors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Get All Users => /api/v1/users
router.get('/', catchAsyncError(async (req, res) => {
    const userList = await User.find().select('-passwordHash');

    if (!userList) {
        return res.status(404).json({
            success: false
        })
    }
    res.status(200).send(userList);
}));

// Get Single User => /api/v1/users/:id
router.get('/:id', catchAsyncError(async (req, res) => {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) return res.status(404).json({
        message: 'The user with given id not found!'
    });

    res.status(200).send(user);
}));

// Register Users - For ADMIN => /api/v1/categories
router.post('/', catchAsyncError(async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,

    });

    user = await user.save();
    if (!user) {
        return res.status(400)
            .send('The user cannot be created')
    }
    res.status(201).send(user);
}));

// Login User => /api/v1/users/login
router.post('/login', catchAsyncError(async (req, res) => {
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        return res.status(404).send('The user not found');
    }
    // compare password
    if (user && bcrypt.compareSync(req.body.password, user.passwordHash)) {
        const token = jwt.sign(
            {
                userId: user.id,
                isAdmin: user.isAdmin

            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN }
        )
        return res.status(200).send({
            user: user.email,
            token
        });
    }
    else {
        return res.status(400).send('Password is wrong');
    }
}));

// Register Users => /api/v1/categories
router.post('/register', catchAsyncError(async (req, res) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country,
    });

    user = await user.save();
    if (!user) {
        return res.status(400)
            .send('The user cannot be created')
    }
    res.status(201).send(user);
}));

// Delete User => /api/v1/users/:id
router.delete('/:id', (req, res) => {
    User.findByIdAndDelete(req.params.id)
        .then((user) => {
            if (user) {
                return res.status(200).json({
                    success: true,
                    message: 'The user Deleted!'
                });
            }
            else {
                return res.status(404).json({
                    success: false,
                    message: 'The user not found!'
                });
            }
        }).catch(err => {
            return res.status(400).json({
                success: false,
                error: err
            });
        })
});

// Get Users Count => /api/v1/users/get/count
router.get('/get/count', catchAsyncError(async (req, res) => {
    const userCount = await User.countDocuments(count => count);

    if (!userCount) {
        return res.status(404).json({
            success: false,
            message: 'User not found'
        })
    }
    res.status(200).json({
        userCount
    });
}));


module.exports = router;