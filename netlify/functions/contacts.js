import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL);

export async function handler(event) {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };

  // Path: /api/contacts  or  /api/contacts/:id
  // Also handles /api/properties/:propertyId/contacts (for listing/creating)
  const raw = event.path
    .replace('/.netlify/functions/contacts', '')
    .replace('/api/contacts', '');
  const parts = raw.split('/').filter(Boolean);

  try {
    // GET /api/contacts?property_id=X  — list contacts for a property
    if (event.httpMethod === 'GET' && parts.length === 0) {
      const propId = event.queryStringParameters?.property_id;
      if (!propId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'property_id required' }) };
      const rows = await sql`
        SELECT * FROM property_contacts WHERE property_id = ${propId} ORDER BY created_at
      `;
      return { statusCode: 200, headers, body: JSON.stringify(rows) };
    }

    // POST /api/contacts  — create contact
    if (event.httpMethod === 'POST' && parts.length === 0) {
      const data = JSON.parse(event.body);
      if (!data.property_id || !data.name) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'property_id and name required' }) };
      }
      const result = await sql`
        INSERT INTO property_contacts (property_id, name, role, phone, email, notes)
        VALUES (${data.property_id}, ${data.name}, ${data.role || null}, ${data.phone || null}, ${data.email || null}, ${data.notes || null})
        RETURNING *
      `;
      return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
    }

    // PATCH /api/contacts/:id  — update contact
    if (event.httpMethod === 'PATCH' && parts.length === 1) {
      const id = parts[0];
      const data = JSON.parse(event.body);
      const fields = Object.keys(data);
      const values = Object.values(data);
      const setClause = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
      const result = await sql.query(
        `UPDATE property_contacts SET ${setClause}, updated_at = now() WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, id]
      );
      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    // DELETE /api/contacts/:id  — delete contact
    if (event.httpMethod === 'DELETE' && parts.length === 1) {
      const id = parts[0];
      await sql`DELETE FROM property_contacts WHERE id = ${id}`;
      return { statusCode: 204, headers, body: '' };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
