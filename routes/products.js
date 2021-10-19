const express = require('express');
const Category = require('../models/category');
const Product = require('../models/product');
const mongoose = require('mongoose');
const router = express.Router();
const catchAsyncError = require('../middlewares/catchAsyncErrors');
const multer = require('multer');
const fs = require('fs');

// --Multer Config
// MIME Type is media type , a standard that indicates the nature of document files
const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg'
};

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        // check if file type is valid
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('Invalid File type extension');

        if (isValid) {
            uploadError = null;
        }

        cb(uploadError, 'public/uploads')
    },
    // filename would be red-cars-17082021111709
    filename: function (req, file, cb) {
        const fileName = file.originalname.split(' ').join('-');
        const extension = FILE_TYPE_MAP[file.mimetype];

        cb(null, `${fileName}-${Date.now()}.${extension}`)
    }
});

const uploadOptions = multer({ storage: storage });

// Get All Products => /api/v1/products
//for filter => /api/v1/products?categories=6114196235f8692078ed8629,6114196235f8692078ed8628
router.get('/', catchAsyncError(async (req, res) => {
    let filter = {};
    if (req.query.categories) {
        filter = { category: req.query.categories.split(',') }
    }
    const productList = await Product.find(filter).populate('category');
    if (!productList) {
        return res.status(404).json({
            success: false,
            message: 'Products not found'
        })
    }
    res.status(200).send(productList)
}));

// Get Single Product => /api/v1/products/:id
router.get('/:id', catchAsyncError(async (req, res) => {
    const product = await Product.findById(req.params.id).populate('category');
    if (!product) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        })
    }
    res.status(200).send(product)
}));

// Create Product => /api/v1/products
router.post('/', uploadOptions.single('image'), catchAsyncError(async (req, res) => {

    // check if there is file(image) in request
    const file = req.file;
    if (!file) return res.status(404).send('No image found in request');

    const category = await Category.findById(req.body.category);
    if (!category) return res.status(404).send('Invalid Category');

    // product image config
    const fileName = req.file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: `${basePath}${fileName}`, //http:localhost:3000/public/uploads/red-cars-132345342
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numOfReviews: req.body.numOfReviews,
        isFeatured: req.body.isFeatured
    });

    product = await product.save();
    if (!product) return res.status(500).send('Product cannot be created');

    res.status(201).send(product);
}));

// Update Product => /api/v1/products/:id
router.put('/:id', uploadOptions.single('image'), catchAsyncError(async (req, res) => {

    const category = await Category.findById(req.body.category);
    if (!category) return res.status(404).send('Invalid Category');

    // check if product exist
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).send('No product found');

    const file = req.file;
    let imagePath;
    // if image exist in request
    if (file) {
        const fileName = req.file.filename;
        const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
        imagePath = `${basePath}${fileName}`;
    }
    else {
        // same as old image path
        imagePath = product.image;
    }

    const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        {
            name: req.body.name,
            description: req.body.description,
            richDescription: req.body.richDescription,
            image: imagePath,
            brand: req.body.brand,
            price: req.body.price,
            category: req.body.category,
            countInStock: req.body.countInStock,
            rating: req.body.rating,
            numOfReviews: req.body.numOfReviews,
            isFeatured: req.body.isFeatured
        },
        {
            new: true,
            runValidators: true,
            useFindAndModify: false
        }
    );
    if (!updatedProduct) return res.status(404).send('The product cannot be updated')
    res.status(200).send(updatedProduct);
}));

// Delete Product => /api/v1/products/:id
router.delete('/:id', (req, res) => {

    Product.findByIdAndDelete(req.params.id)
        .then((product) => {
            if (product) {
                const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

                if (product.images[0] !== null) {
                    // deleting associated product gallery
                    for (let i = 0; i < product.images.length; i++) {
                        let filePath = `${__dirname}/public/uploads/${product.images[i].replace(basePath, '')}`.replace('\\routes', '');
                        // delete images
                        fs.unlink(filePath, err => {
                            if (err) return console.log({ err });
                        });
                    }
                }
                
                // deleting single image
                const filePath = `${__dirname}/public/uploads/${product.image.replace(basePath, '')}`.replace('\\routes', '');

                fs.unlink(filePath, err => {
                    if (err) return console.log({ err });
                });

                return res.status(200).json({
                    success: true,
                    message: 'The product Deleted!'
                });
            }
            else {
                return res.status(404).json({
                    success: false,
                    message: 'The product not found!'
                });
            }
        }).catch(err => {
            return res.status(400).json({
                success: false,
                error: err
            });
        })
});

// Get Product Count => /api/v1/products/get/count
router.get('/get/count', catchAsyncError(async (req, res) => {
    const productCount = await Product.countDocuments(count => count);

    if (!productCount) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        })
    }
    res.status(200).json({
        productCount
    });
}));

// Get Featured Products => /api/v1/products/get/featured/:count
router.get('/get/featured/:count', catchAsyncError(async (req, res) => {
    const count = req.params.count ? req.params.count : 0
    const products = await Product.find({
        isFeatured: true
    }).limit(+count);

    if (!products) {
        return res.status(404).json({
            success: false,
            message: 'Product not found'
        })
    }
    res.status(200).send(products)
}));

// Update/Create image gallery for products => /api/v1/products/gallery-images/:id
router.put('/gallery-images/:id', uploadOptions.array('images', 10), catchAsyncError(async (req, res) => {
    const files = req.files;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    let imagesPaths = [];

    if (files) {
        files.map(file => {
            imagesPaths.push(`${basePath}${file.filename}`);
        });
    }

    const product = await Product.findByIdAndUpdate(
        req.params.id,
        {
            images: imagesPaths
        },
        {
            new: true,
            runValidators: true,
            useFindAndModify: false
        }
    );
    if (!product) return res.status(404).send('The product cannot be updated')
    res.status(200).send(product);

}));

module.exports = router;