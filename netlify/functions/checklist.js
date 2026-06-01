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

  const path = event.path.replace('/.netlify/functions/checklist', '').replace('/api/checklist', '');
  const parts = path.split('/').filter(Boolean);

  try {
    // GET /api/checklist/sections - Get all sections
    if (event.httpMethod === 'GET' && parts.length === 1 && parts[0] === 'sections') {
      const sections = await sql`SELECT * FROM checklist_sections ORDER BY sort_order`;
      return { statusCode: 200, headers, body: JSON.stringify(sections) };
    }

    // POST /api/checklist/sections - Create section
    if (event.httpMethod === 'POST' && parts.length === 1 && parts[0] === 'sections') {
      const data = JSON.parse(event.body);
      const result = await sql`
        INSERT INTO checklist_sections (name, description, sort_order, is_default)
        VALUES (${data.name}, ${data.description || null}, ${data.sort_order}, ${data.is_default || true})
        RETURNING *
      `;
      return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
    }

    // PATCH /api/checklist/sections/:id - Update section
    if (event.httpMethod === 'PATCH' && parts.length === 2 && parts[0] === 'sections') {
      const id = parts[1];
      const data = JSON.parse(event.body);
      const fields = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
      const result = await sql.query(
        `UPDATE checklist_sections SET ${setClause}, updated_at = now() WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, id]
      );
      
      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    // DELETE /api/checklist/sections/:id - Delete section
    if (event.httpMethod === 'DELETE' && parts.length === 2 && parts[0] === 'sections') {
      const id = parts[1];
      await sql`DELETE FROM checklist_sections WHERE id = ${id}`;
      return { statusCode: 204, headers, body: '' };
    }

    // GET /api/checklist/items - Get items (with optional filters)
    if (event.httpMethod === 'GET' && parts.length === 1 && parts[0] === 'items') {
      const queryParams = event.queryStringParameters || {};
      let items;
      
      if (queryParams.section_id) {
        items = await sql`
          SELECT * FROM checklist_items 
          WHERE section_id = ${queryParams.section_id}
          ORDER BY sort_order
        `;
      } else if (queryParams.property_id) {
        items = await sql`
          SELECT * FROM checklist_items 
          WHERE property_id = ${queryParams.property_id} OR property_id IS NULL
          ORDER BY sort_order
        `;
      } else {
        items = await sql`SELECT * FROM checklist_items ORDER BY sort_order`;
      }
      
      return { statusCode: 200, headers, body: JSON.stringify(items) };
    }

    // POST /api/checklist/items - Create item
    if (event.httpMethod === 'POST' && parts.length === 1 && parts[0] === 'items') {
      const data = JSON.parse(event.body);
      const result = await sql`
        INSERT INTO checklist_items (section_id, property_id, label, item_type, placeholder, help_text, is_required, is_default, sort_order, is_active)
        VALUES (${data.section_id}, ${data.property_id || null}, ${data.label}, ${data.item_type}, ${data.placeholder || null}, ${data.help_text || null}, ${data.is_required || false}, ${data.is_default ?? false}, ${data.sort_order ?? 0}, ${data.is_active !== undefined ? data.is_active : true})
        RETURNING *
      `;
      return { statusCode: 201, headers, body: JSON.stringify(result[0]) };
    }

    // PATCH /api/checklist/items/:id - Update item
    if (event.httpMethod === 'PATCH' && parts.length === 2 && parts[0] === 'items') {
      const id = parts[1];
      const data = JSON.parse(event.body);
      const fields = Object.keys(data);
      const values = Object.values(data);
      
      const setClause = fields.map((field, i) => `${field} = $${i + 1}`).join(', ');
      const result = await sql.query(
        `UPDATE checklist_items SET ${setClause}, updated_at = now() WHERE id = $${fields.length + 1} RETURNING *`,
        [...values, id]
      );
      
      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    // DELETE /api/checklist/items/:id - Delete item
    if (event.httpMethod === 'DELETE' && parts.length === 2 && parts[0] === 'items') {
      const id = parts[1];
      await sql`DELETE FROM checklist_items WHERE id = ${id}`;
      return { statusCode: 204, headers, body: '' };
    }

    // GET /api/checklist/responses?property_id=X - Saved checklist responses for a house
    if (event.httpMethod === 'GET' && parts.length === 1 && parts[0] === 'responses') {
      const queryParams = event.queryStringParameters || {};
      if (!queryParams.property_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'property_id is required' }) };
      }
      const responses = await sql`
        SELECT * FROM property_item_responses WHERE property_id = ${queryParams.property_id}
      `;
      return { statusCode: 200, headers, body: JSON.stringify(responses) };
    }

    // POST /api/checklist/response - Upsert a response for (property_id, checklist_item_id)
    if (event.httpMethod === 'POST' && parts.length === 1 && parts[0] === 'response') {
      const data = JSON.parse(event.body);
      if (!data.property_id || !data.checklist_item_id) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'property_id and checklist_item_id are required' }) };
      }
      const valueCols = ['checked', 'text_value', 'number_value', 'rating_value', 'status_value', 'note'];
      const provided = valueCols.filter(c => c in data);
      const cols = ['property_id', 'checklist_item_id', ...provided];
      const vals = [data.property_id, data.checklist_item_id, ...provided.map(c => data[c])];
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const updateSet = [...provided.map(c => `${c} = EXCLUDED.${c}`), 'updated_at = now()'].join(', ');
      const result = await sql.query(
        `INSERT INTO property_item_responses (${cols.join(', ')}) VALUES (${placeholders})
         ON CONFLICT (property_id, checklist_item_id) DO UPDATE SET ${updateSet}
         RETURNING *`,
        vals
      );
      return { statusCode: 200, headers, body: JSON.stringify(result[0]) };
    }

    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Not found' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
}
