#!/bin/bash

# Database migration script for fantasy_leagues table
# This script will update the database schema to support the new league structure

echo "Starting database migration..."

# Get database credentials from environment or use defaults
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-fantasy_app}
DB_USER=${DB_USER:-postgres}

echo "Connecting to database: $DB_NAME"

# Execute the migration
psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f migrations/update_fantasy_leagues.sql

if [ $? -eq 0 ]; then
    echo "✅ Migration completed successfully!"
else
    echo "❌ Migration failed. Please check the error messages above."
    exit 1
fi

echo "Database schema updated."
