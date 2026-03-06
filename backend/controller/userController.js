const { pool } = require('../db/db.js');
const bcrypt = require('bcrypt');

// Users
const getUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, email, role, designation FROM users ORDER BY id DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createUser = async (req, res) => {
    const { name, email, role, designation, password } = req.body;
    try {
        // Hash the password before saving
        const saltRounds = 10;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const result = await pool.query(
            'INSERT INTO users (name, email, role, designation, password) VALUES ($1, $2, $3, $4, $5) RETURNING id',
            [name, email, role, designation, hashedPassword]
        );
        res.status(201).json({ id: result.rows[0].id, name, email, role, designation });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, email, role, designation } = req.body;
    try {
        await pool.query(
            'UPDATE users SET name = $1, email = $2, role = $3, designation = $4 WHERE id = $5',
            [name, email, role, designation, id]
        );
        res.status(200).json({ message: 'User updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.status(200).json({ message: 'User deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Roles
const getRoles = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM roles ORDER BY id DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createRole = async (req, res) => {
    const { name, permissions } = req.body;
    try {
        const result = await pool.query('INSERT INTO roles (name, permissions) VALUES ($1, $2) RETURNING *', [name, JSON.stringify(permissions)]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateRole = async (req, res) => {
    const { id } = req.params;
    const { name, permissions } = req.body;
    try {
        const result = await pool.query(
            'UPDATE roles SET name = $1, permissions = $2 WHERE id = $3 RETURNING *',
            [name, JSON.stringify(permissions), id]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteRole = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM roles WHERE id = $1', [id]);
        res.status(200).json({ message: 'Role deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Designations
const getDesignations = async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM designations ORDER BY id DESC');
        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const createDesignation = async (req, res) => {
    const { name } = req.body;
    try {
        const result = await pool.query('INSERT INTO designations (name) VALUES ($1) RETURNING *', [name]);
        res.status(201).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const updateDesignation = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    try {
        const result = await pool.query(
            'UPDATE designations SET name = $1 WHERE id = $2 RETURNING *',
            [name, id]
        );
        res.status(200).json(result.rows[0]);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteDesignation = async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM designations WHERE id = $1', [id]);
        res.status(200).json({ message: 'Designation deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = {
    getUsers, createUser, updateUser, deleteUser,
    getRoles, createRole, updateRole, deleteRole,
    getDesignations, createDesignation, updateDesignation, deleteDesignation
};
