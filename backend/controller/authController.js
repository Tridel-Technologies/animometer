const { pool } = require('../db/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const user = result.rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        // Get permissions for the role
        const roleResult = await pool.query('SELECT permissions FROM roles WHERE name = $1', [user.role]);
        const permissions = roleResult.rows[0]?.permissions || {};

        const token = jwt.sign(
            { id: user.id, email: user.email, role: user.role, permissions },
            'STATION_SECRET_KEY',
            { expiresIn: '2d' }
        );

        res.status(200).json({
            token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
                designation: user.designation,
                permissions
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const checkEmail = async (req, res) => {
    const { email } = req.body;
    try {
        const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (result.rows.length > 0) {
            res.status(200).json({ exists: true });
        } else {
            res.status(404).json({ exists: false, error: 'Email not found' });
        }
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const resetPassword = async (req, res) => {
    const { email, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query('UPDATE users SET password = $1 WHERE email = $2', [hashedPassword, email]);
        res.status(200).json({ message: 'Password updated successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

module.exports = { login, checkEmail, resetPassword };
