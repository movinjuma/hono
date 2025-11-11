import { Hono } from 'hono';
import { getCountries } from './get.js';
import { createCountry } from './create.js';
import { getCountryById } from './id.js';
import { updateCountry } from './update.js';
import { deleteCountry } from './delete.js';

const countries = new Hono();

// Public endpoints
countries.get('/', getCountries);           // List all countries
countries.get('/:id', getCountryById);      // Get a specific country

// CEO-only endpoints
countries.post('/', createCountry);         // Create a new country
countries.put('/:id', updateCountry);       // Update a country (CEO only)
countries.delete('/:id', deleteCountry);    // Delete a country (CEO only)

export default countries;
