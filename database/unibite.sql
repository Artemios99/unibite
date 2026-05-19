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


-- meals
ALTER TABLE meals ADD price DECIMAL(5,2) DEFAULT 0;

-- requests
ALTER TABLE requests ADD portions INT;
ALTER TABLE requests ADD note TEXT;

-- αν έχεις user_id αντί για consumer_id:
ALTER TABLE requests CHANGE user_id consumer_id INT;

-- status update
ALTER TABLE requests MODIFY status 
ENUM('pending','accepted','completed') DEFAULT 'pending';


-- 18/5/2026

ALTER TABLE meals
ADD latitude DECIMAL(10, 8) NULL,
ADD longitude DECIMAL(11, 8) NULL;

ALTER TABLE requests MODIFY status 
ENUM('pending','accepted','rejected','completed') DEFAULT 'pending';

-touta en eimai telia siouros an prepei se esas
UPDATE meals 
SET location = 'CEID',
    latitude = 38.2885,
    longitude = 21.7889
WHERE id = 4;

UPDATE meals 
SET location = 'Βιβλιοθήκη Πανεπιστημίου',
    latitude = 38.2897,
    longitude = 21.7869
WHERE id = 5;



------
ALTER TABLE meals
ADD COLUMN allergens TEXT;

ALTER TABLE requests
ADD COLUMN picked_up TINYINT DEFAULT 0;

--------------------

ALTER TABLE requests
MODIFY picked_up TINYINT NULL DEFAULT NULL;

UPDATE requests
SET picked_up = NULL
WHERE status = 'accepted' AND picked_up = 0;

-----------------

ALTER TABLE ratings
ADD COLUMN request_id INT NULL;

ALTER TABLE ratings
ADD FOREIGN KEY (request_id) REFERENCES requests(id);

ALTER TABLE requests
ADD COLUMN picked_up_at DATETIME NULL,
ADD COLUMN rating_penalty_applied TINYINT DEFAULT 0;

UPDATE requests
SET picked_up_at = NOW()
WHERE picked_up = 1 AND picked_up_at IS NULL;
