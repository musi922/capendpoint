const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const SECRET_KEY = process.env.SECRET_KEY || 'default-secret-key-for-development';

module.exports = cds.service.impl(async function () {
    const { Products, Cart, Users } = this.entities;

    try {
        const adminExists = await SELECT.from(Users).where({ username: 'admin' });
        
        if (adminExists.length === 0) {
            const hashedPassword = await bcrypt.hash('adminpassword', 10);
            await INSERT.into(Users).entries({
                ID: cds.utils.uuid(),
                username: 'admin',
                password: hashedPassword,
                role: 'admin'
            });
            console.log('Admin user created');
        }
    } catch (error) {
        console.error('Error initializing admin:', error);
    }

    this.on('login', async req => {
        const { username, password } = req.data;
        
        try {
            const user = await SELECT.from(Users).where({ username });
            console.log("Found user:", user[0]); 
            
            if (!user.length || !(await bcrypt.compare(password, user[0].password))) {
                return req.error(401, 'Invalid credentials');
            }
    
            const userRole = user[0].role || 'user';
            
            const token = jwt.sign(
                { id: user[0].ID, username: user[0].username, role: userRole },
                SECRET_KEY,
                { expiresIn: '1h' }
            );
            
            return { token, role: userRole };
        } catch (error) {
            console.error("Login error:", error);
            return req.error(500, 'Login failed');
        }
    });

    this.before('*', async req => {
        if (req.event === 'login') return;
    
        const authHeader = req.headers.authorization;
        if (!authHeader) return req.error(401, 'No token provided');
    
        try {
            const token = authHeader.replace('Bearer ', '');
            req.user = jwt.verify(token, SECRET_KEY);
            
            if (req.user.exp * 1000 < Date.now()) {
                return req.error(401, 'Token expired');
            }
        } catch (error) {
            return req.error(401, 'Invalid token');
        }
    });

    this.before(['CREATE', 'UPDATE', 'DELETE'], 'Products', req => {
        if (req.user.role !== 'admin') return req.error(403, 'Admin access required');
    });

    this.before(['READ', 'CREATE', 'DELETE'], 'Cart', req => {
        if (req.user.role !== 'user') return req.error(403, 'User access required');
    });

    this.before('DELETE', 'Cart', async (req) => {
        const tx = cds.transaction(req);
        const { CartId } = req.data;

        try {
            const cartItem = await tx.read(Cart).where({ 
                CartId,
                user_ID: req.user.id 
            });

            if (!cartItem.length) {
                return req.error(404, "Cart item not found or doesn't belong to the current user");
            }

            const productId = cartItem[0].product_ProductId.ProductId;
            console.log("Product ID to update:", productId);

            await tx.update(Products)
                .set({ isInCart: false })
                .where({ ProductId: productId });

            console.log("Updated product isInCart flag for product:", productId);
        } catch (error) {
            console.error("Delete error:", error);
            return req.error(500, "Failed to process delete request");
        }
    });

    this.on('addToCart', async req => {
        const { ProductId } = req.data;
        const tx = cds.transaction(req);

        const product = await tx.read(Products).where({ ProductId, isInCart: false });
        if (!product.length) {
            return req.error('Product not found or already in cart');
        }

        await tx.update(Products)
            .set({ isInCart: true })
            .where({ ProductId: ProductId });

        const cartItem = {
            CartId: cds.utils.uuid(),
            product_ProductId: { ProductId },
            user_ID: req.user.id,
            quantity: 1,
            dateAdded: new Date(),
        };
        console.log("Cart Item Added:", cartItem);

        await tx.create(Cart).entries(cartItem);
        return { success: true };
    });

    this.on('getCartItems', async req => {
        if (req.user.role !== 'user') {
            return req.error(403, 'User access required');
        }

        return cds.transaction(req).read(Cart).where({ user_ID: req.user.id }).columns(c => {
            c('*');
            c.product_ProductId('*');
        });
    });

    this.on('Users', async req => {
        if (req.user.role !== 'admin') {
            return req.error(403, 'Admin access required');
        }
        return SELECT.from(Users);
    })

    this.on('createUser', async req => {
        if (req.user.role !== 'admin') return req.error(403, 'Admin access required');
    
        try {
            const { username, password, role } = req.data;
            console.log("Creating user with role:", role);
            const hashedPassword = await bcrypt.hash(password, 10);
    
            await INSERT.into(Users).entries({
                ID: cds.utils.uuid(),
                username,
                password: hashedPassword,
                role: role || 'user'  
            });
    
            return { message: 'User created successfully' };
        } catch (error) {
            console.error("User creation error:", error);
            return req.error(500, 'Failed to create user');
        }
    });

    this.on('DELETE', 'Users', async (req) => {
        if (req.user.role !== 'admin') {
            return req.error(403, 'Admin access required');
        }

        const username = req.data.ID;
        
        try {
            if (username === 'admin') {
                return req.error(403, 'Cannot delete admin user');
            }

            const result = await DELETE.from(Users).where({ username: username });
            
            if (result === 0) {
                return req.error(404, 'User not found');
            }

            return { message: 'User deleted successfully' };
        } catch (error) {
            console.error("Error deleting user:", error);
            return req.error(500, 'Failed to delete user');
        }
    });

});