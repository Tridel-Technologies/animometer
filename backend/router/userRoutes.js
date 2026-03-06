const express = require('express');
const router = express.Router();
const userController = require('../controller/userController');

// User routes
router.get('/users', userController.getUsers);
router.post('/users', userController.createUser);
router.put('/users/:id', userController.updateUser);
router.delete('/users/:id', userController.deleteUser);

// Role routes
router.get('/roles', userController.getRoles);
router.post('/roles', userController.createRole);
router.put('/roles/:id', userController.updateRole);
router.delete('/roles/:id', userController.deleteRole);

// Designation routes
router.get('/designations', userController.getDesignations);
router.post('/designations', userController.createDesignation);
router.put('/designations/:id', userController.updateDesignation);
router.delete('/designations/:id', userController.deleteDesignation);

module.exports = router;
