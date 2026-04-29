/**
 * Script to remove QA Audit Product by setting isVisible = false
 */

const { dbClient } = require('./dist/src/lib/db');

async function removeQAProduct() {
  try {
    // Find the QA Audit Product
    const result = await dbClient.execute({
      sql: `SELECT id, name, slug FROM products WHERE name LIKE 'QA Audit Product%'`,
      args: []
    });
    
    console.log('Found products:', result.rows);
    
    if (result.rows.length === 0) {
      console.log('No QA Audit Product found');
      return;
    }
    
    // Update to set isVisible = false
    for (const row of result.rows) {
      await dbClient.execute({
        sql: `UPDATE products SET is_visible = 0 WHERE id = ?`,
        args: [row.id]
      });
      console.log(`Hidden product: ${row.name} (id: ${row.id})`);
    }
    
    console.log('QA Audit Product removed successfully!');
  } catch (error) {
    console.error('Error removing QA product:', error);
  }
}

removeQAProduct();
