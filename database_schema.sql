-- Connect to the safe_circle database 
-- \c safe_circle

-- 1. Create the User Registration Table
CREATE TABLE IF NOT EXISTS "Users" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "fullName" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL UNIQUE,
    "phoneNumber" VARCHAR(20) NOT NULL UNIQUE,
    "password" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 2. Create the Device Registration Table
CREATE TABLE IF NOT EXISTS "Devices" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL REFERENCES "Users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    "deviceName" VARCHAR(255) NOT NULL,
    "deviceModel" VARCHAR(255) NOT NULL,
    "imeiNumber" VARCHAR(255) NOT NULL UNIQUE,
    "deviceOs" VARCHAR(255) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
