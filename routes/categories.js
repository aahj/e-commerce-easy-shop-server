const express = require('express');
const router = express.Router();
const Category = require('../models/category');
const catchAsyncError = require('../middlewares/catchAsyncErrors');

// Get All Categories => /api/v1/categories
router.get('/', catchAsyncError(async (req, res) => {
    const categoryList = await Category.find();
    if (!categoryList) {
        return res.status(404).json({
            success: false
        })
    }
    res.status(200).send(categoryList);
}));

// Get Single Category => /api/v1/categories/:id
router.get('/:id', catchAsyncError(async (req, res) => {
    const category = await Category.findById(req.params.id);
    if (!category) {
        return res.status(404).json({
            message: 'The category with given id was not found!'
        })
    }
    res.status(200).send(category);
}));

// Create Category => /api/v1/categories
router.post('/', catchAsyncError(async (req, res) => {
    let category = new Category({
        name: req.body.name,
        icon: req.body.icon,
        color: req.body.color
    });

    category = await category.save();
    if (!category) {
        return res.status(404)
            .send('The category cannot be created')
    }
    res.send(category)
}));

// Delete Category => /api/v1/categories/:id
router.delete('/:id', (req, res) => {
    Category.findByIdAndDelete(req.params.id)
        .then((category) => {
            if (category) {
                return res.status(200).json({
                    success: true,
                    message: 'The category Deleted!'
                });
            }
            else {
                return res.status(404).json({
                    success: false,
                    message: 'The category not found!'
                });
            }
        }).catch(err => {
            return res.status(400).json({
                success: false,
                error: err
            });
        })
});

// Update Category => /api/v1/categories/:id
router.put('/:id', catchAsyncError(async (req, res, next) => {
    const category = await Category.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            icon: req.body.icon,
            color: req.body.color
        },
        {
            new: true,
            runValidators: true,
            useFindAndModify: false
        }
    );
    if (!category) {
        return res.status(404).send('The category cannot be updated')
    }

    res.status(200).send(category);
}));


module.exports = router;