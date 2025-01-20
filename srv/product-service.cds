using { com.products.manager.cap as my } from '../db/schema';

service ProductService {
    entity Products as projection on my.Products;
    entity Cart as projection on my.Cart;
    entity Users as projection on my.Users;
    
    action login(username: String, password: String) returns {
        token: String;
        role: String;
    };

    action addToCart(ProductId: String) returns Cart;
    function getCartItems() returns array of Cart;
    
    // Add this new action
    action createUser(username: String, password: String, role: String) returns {
        message: String
    };
}