CREATE DATABASE IF NOT EXISTS unibite;
USE unibite;

-- USERS
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    email VARCHAR(100),
    password VARCHAR(100),
    points INT DEFAULT 5,
    role ENUM('cook','consumer','admin') DEFAULT 'consumer',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- MEALS (αγγελίες)
CREATE TABLE meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    title VARCHAR(100),
    description TEXT,
    portions INT,
    location VARCHAR(255),
    pickup_time DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- REQUESTS (αιτήματα)
CREATE TABLE requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meal_id INT,
    user_id INT,
    status ENUM('pending','accepted','rejected') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES meals(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- RATINGS (αξιολογήσεις)
CREATE TABLE ratings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    meal_id INT,
    user_id INT,
    rating INT CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (meal_id) REFERENCES meals(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);