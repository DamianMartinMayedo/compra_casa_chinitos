import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  const path = event.path.replace('/.netlify/functions/properties', '').replace('/api/properties', '');
  const parts = path.split('/').filter(Boolean);

  try {
    // GET /api/properties - List all properties
    if (event.httpMethod === 'GET' && parts.length === 0) {
      const properties = await sql`SELECT * FROM properties ORDER BY created_at DESC`;
      return { statusCode: 200, headers, body: JSON.stringify(properties) };
    }

    // POST /api/properties - Create property
    if (event.httpMethod === 'POST' && parts.length === 0) {
      const data = JSON.parse(event.body);
      const result = await sql`
        INSERT INTO properties (name, google_address, price_eur, municipality, idealista_url, type, built_area_m2, plot_area_m2, bedrooms, bathrooms, floors, year_built, initial_state_summary, additional_notes, budget_min_eur, budget_max_eur)
        VALUES (${data.name}, ${data.google_address}, ${data.price_eur}, ${data.municipality || null}, ${data.idealista_url || null}, ${data.type || null}, ${data.built_area_m2 || null}, ${data.plot_area_m2 || null}, ${data.bedrooms || null}, ${data.bathrooms || null}, ${data.floors || null}, ${data.year_built || null}, ${data.initial_state_summary || null}, ${data.additional_notes || null}, ${data.budget_min_eur || null}, ${data.budget_max_eur || null})
        RETURNING *
      `;
      return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
    }

    // GET /api/properties/:id - Get single property
    if (event.httpMethod === 'GET' && parts.length === 1) {
      const id = parts[0];
      const result = await sql`SELECT * FROM properties WHERE id = ${id}`;
      if (result.length === 0) {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Property not found' }) };
      }
      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    // PATCH /api/properties/:id - Update property
    if (event.httpMethod === 'PATCH' && parts.length === 1) {
      const id = parts[0];
      const data = JSON.parse(event.body);
      const fields = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
      const result = await sql.query(
        `UPDATE properties SET ${setClause}, updated_at = now() WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, id]
      );
      
      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    // DELETE /api/properties/:id - Delete property
    if (event.httpMethod === 'DELETE' && parts.length === 1) {
      const id = parts[0];
      await sql`DELETE FROM properties WHERE id = ${id}`;
      return { statusCode: 204, headers, body: '' };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
