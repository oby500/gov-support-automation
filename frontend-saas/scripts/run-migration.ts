#!/usr/bin/env node

/**
 * Database Migration Runner
 *
 * Automatically runs the notification system migration
 * Usage: pnpm tsx scripts/run-migration.ts
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import postgres from 'postgres';

async function runMigration() {
  console.log('🚀 Database Migration Runner\n');
  console.log('═'.repeat(60));

  // Check environment variable
  const databaseUrl = process.env.POSTGRES_URL;

  if (!databaseUrl) {
    console.error('❌ POSTGRES_URL environment variable not set');
    console.error('   Please set it in your .env file');
    process.exit(1);
  }

  console.log('🔄 Connecting to database...');
  const sql = postgres(databaseUrl);

  try {
    const migrationPath = resolve(
      __dirname,
      '../lib/db/migrations/0002_add_notification_system.sql'
    );

    console.log('📄 Reading migration file...');
    console.log(`   Path: ${migrationPath}\n`);

    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running migration...');
    await sql.unsafe(migrationSQL);

    console.log('✅ Migration completed successfully!\n');
    console.log('═'.repeat(60));
    console.log('📊 Verifying changes...\n');

    // Verify users table columns
    const usersColumns = await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'users'
        AND column_name IN ('phone', 'notification_enabled')
      ORDER BY column_name;
    `;

    console.log('✓ Users table columns:');
    if (usersColumns.length === 0) {
      console.error('  ❌ No columns found - migration may have failed');
    } else {
      usersColumns.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable}, default: ${col.column_default || 'none'})`);
      });
    }

    // Verify notification_logs table exists
    const notificationLogsExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'notification_logs'
      );
    `;

    console.log('');
    if (notificationLogsExists[0].exists) {
      console.log('✓ notification_logs table created');

      const notificationLogsColumns = await sql`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'notification_logs'
        ORDER BY ordinal_position;
      `;

      console.log('  Columns:');
      notificationLogsColumns.forEach((col) => {
        console.log(`  - ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.error('  ❌ notification_logs table not found - migration may have failed');
    }

    // Verify indexes
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'notification_logs'
      ORDER BY indexname;
    `;

    console.log('');
    console.log('✓ Indexes created:');
    if (indexes.length === 0) {
      console.error('  ❌ No indexes found - migration may have failed');
    } else {
      indexes.forEach((idx) => {
        console.log(`  - ${idx.indexname}`);
      });
    }

    // Verify foreign key
    const foreignKeys = await sql`
      SELECT
        tc.constraint_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'notification_logs';
    `;

    console.log('');
    console.log('✓ Foreign keys:');
    if (foreignKeys.length === 0) {
      console.error('  ❌ No foreign keys found - migration may have failed');
    } else {
      foreignKeys.forEach((fk) => {
        console.log(`  - ${fk.constraint_name}: ${fk.column_name} → ${fk.foreign_table_name}(${fk.foreign_column_name})`);
      });
    }

    console.log('');
    console.log('═'.repeat(60));
    console.log('✅ Migration verification completed!');
    console.log('');
    console.log('📌 Next steps:');
    console.log('   1. Update users with phone numbers for testing');
    console.log('   2. Test notification system');
    console.log('   3. Deploy to production');
    console.log('═'.repeat(60));

  } catch (error) {
    console.error('');
    console.error('═'.repeat(60));
    console.error('❌ Migration failed!');
    console.error('═'.repeat(60));
    console.error('');
    console.error('Error details:');
    console.error(error);
    console.error('');
    console.error('💡 Troubleshooting:');
    console.error('   1. Check if POSTGRES_URL is correct');
    console.error('   2. Verify database connection');
    console.error('   3. Check if you have ALTER TABLE permissions');
    console.error('   4. Review migration file syntax');
    console.error('');
    console.error('📚 See DATABASE_MIGRATION_GUIDE.md for more help');
    console.error('═'.repeat(60));
    process.exit(1);
  } finally {
    await sql.end();
  }
}

runMigration();
