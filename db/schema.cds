namespace com.products.manager.cap;

entity Products {
    key ProductId : String(10) @title: 'Product ID';
    category: String;
    mainCategory: String;
    taxTarifCode: String;
    supplierName: String;
    weightMeasure: Decimal;
    weightUnit: String;
    description: String;
    name: String;
    productPicUrl: String;
    status: String;
    quantity: Integer;
    uoM: String;
    currencyCode: String;
    price: Decimal;
    width: Decimal;
    depth: Decimal;
    height: Decimal;
    dimUnit: String;    
    rating: Integer;
    isInCart: Boolean default false;
}

entity Cart {
    key CartId: UUID;
    product_ProductId: Association to Products;
    user: Association to Users;
    quantity: Integer;
    dateAdded: Timestamp;
}

entity Users {
    key ID : UUID;
    username : String;
    password : String; 
    role : String; 
}