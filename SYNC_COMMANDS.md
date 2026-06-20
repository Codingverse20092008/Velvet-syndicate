# Database & Inventory Synchronization Commands

Use the following commands from the root directory of the project to backup and restore/synchronize the product inventory between the live database (Turso) and the local files.

## 1. Download/Backup Live Inventory (Sync Down)
Use this command to retrieve products, variants, images, and sizes added via the Admin panel and save them locally to `backend/inventory-backup.json`.

```bash
npm run --prefix backend sync:down
```

---

## 2. Upload/Restore Local Inventory (Sync Up)
Use this command to push your local product database backup from `backend/inventory-backup.json` back up to the live database.

```bash
npm run --prefix backend sync:up
```

> [!NOTE]
> Foreign key constraints are automatically bypassed during the upload (`sync:up`) process to prevent errors when items in existing carts/orders refer to the products being updated.
