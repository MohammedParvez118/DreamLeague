// src/utils/helpers.js

/**
 * Format date for display
 * @param {Date|string} date - The date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toLocaleDateString();
};

/**
 * Calculate tournament status based on team count
 * @param {number} teamsAdded - Number of teams added
 * @param {number} teamCount - Total team count required
 * @returns {string} Status message
 */
export const getTournamentStatus = (teamsAdded, teamCount) => {
  return parseInt(teamsAdded) === teamCount ? '✅ Setup Complete' : '⏳ Pending';
};

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} Validation result
 */
export const validateRequired = (data, requiredFields) => {
  const errors = [];
  
  requiredFields.forEach(field => {
    if (!data[field] || data[field].toString().trim() === '') {
      errors.push(`${field} is required`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};