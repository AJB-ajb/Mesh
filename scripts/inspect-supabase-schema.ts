/**
 * Script to inspect Supabase database schema
 * Connects to Supabase and lists all tables and their columns
 */

import { createClient } from "@supabase/supabase-js";

// Hardcode URLs for testing (from .env file)
const supabaseUrl = "https://jirgkhjdxahfsgqxprhh.supabase.co";
const supabaseKey = "sb_publishable_uJMoVKeUO3P0FXGd1J3WVg_QX_Hmk5V";

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectSchema() {
  console.log("🔍 Inspecting Supabase Schema...\n");
  console.log(`📍 URL: ${supabaseUrl}\n`);

  try {
    // Query information_schema to get all tables
    const { data: tables, error: tablesError } = await supabase
      .from("information_schema.tables")
      .select("table_name")
      .eq("table_schema", "public");

    if (tablesError) {
      console.error("❌ Error fetching tables:", tablesError.message);

      // Try alternative approach: directly query known tables
      console.log(
        "\n🔄 Trying alternative approach - checking common tables...\n",
      );

      const commonTables = [
        "users",
        "profiles",
        "projects",
        "matches",
        "messages",
        "skills",
        "applications",
      ];

      for (const tableName of commonTables) {
        const {
          data: _data,
          error,
          count,
        } = await supabase
          .from(tableName)
          .select("*", { count: "exact", head: true });

        if (!error) {
          console.log(`✅ Table: ${tableName} (${count ?? 0} rows)`);
        }
      }

      return;
    }

    console.log(`📊 Found ${tables?.length ?? 0} tables in public schema:\n`);

    // For each table, get column information
    for (const table of tables || []) {
      const tableName = table.table_name;

      const { data: columns, error: columnsError } = await supabase
        .from("information_schema.columns")
        .select("column_name, data_type, is_nullable")
        .eq("table_schema", "public")
        .eq("table_name", tableName)
        .order("ordinal_position");

      if (columnsError) {
        console.log(`⚠️  ${tableName}: Could not fetch columns`);
        continue;
      }

      console.log(`\n📋 Table: ${tableName}`);
      console.log("   Columns:");
      columns?.forEach((col: Record<string, unknown>) => {
        console.log(
          `   - ${col.column_name} (${col.data_type}) ${col.is_nullable === "YES" ? "nullable" : "NOT NULL"}`,
        );
      });

      // Get row count
      const { count } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true });

      console.log(`   Rows: ${count ?? 0}`);
    }
  } catch (error: unknown) {
    console.error(
      "❌ Unexpected error:",
      error instanceof Error ? error.message : error,
    );
  }
}

inspectSchema();
