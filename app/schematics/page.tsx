import { SchematicLibraryCard } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicLibraryCard";
import { SchematicLibraryControls } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicLibraryControls";
import { SchematicLibraryEmptyState } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicLibraryEmptyState";
import { SchematicLibraryStats } from "@/lib/modules/minecraft-schematic/components/visual-library/SchematicLibraryStats";
import styles from "@/lib/modules/minecraft-schematic/components/visual-library/schematicVisualLibrary.module.css";
import {
  createVisualSchematicLibraryFacets,
  createVisualSchematicLibraryFilters,
  createVisualSchematicLibraryStats,
  filterVisualSchematics,
  hasActiveVisualSchematicFilters,
} from "@/lib/modules/minecraft-schematic/visual-library/filterVisualSchematicLibrary";
import { readVisualSchematicSummaries } from "@/lib/modules/minecraft-schematic/visual-library/readVisualSchematicLibrary";

export const dynamic = "force-dynamic";

type SchematicsPageProps = {
  searchParams?: Promise<{
    q?: string | string[];
    status?: string | string[];
    category?: string | string[];
    theme?: string | string[];
    version?: string | string[];
    tag?: string | string[];
    sort?: string | string[];
  }>;
};

export default async function SchematicsPage({
  searchParams,
}: SchematicsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = createVisualSchematicLibraryFilters(resolvedSearchParams);
  const schematics = await readVisualSchematicSummaries();
  const filteredSchematics = filterVisualSchematics(schematics, filters);
  const facets = createVisualSchematicLibraryFacets(schematics);
  const stats = createVisualSchematicLibraryStats(
    schematics,
    filteredSchematics,
  );
  const hasActiveFilters = hasActiveVisualSchematicFilters(filters);

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>Minecraft schematic module</p>
          <h1 className={styles.title}>Visual Schematic Library</h1>
          <p className={styles.muted}>
            Browse generated schematic assets, filter by metadata, inspect status,
            and open the built-in voxel viewer.
          </p>
        </div>

        <div className={styles.heroMetrics}>
          <span>{schematics.length.toLocaleString()} managed assets</span>
          <span>{stats.totalBlocks.toLocaleString()} total blocks</span>
          {hasActiveFilters ? <span>filtered view active</span> : null}
        </div>
      </section>

      <SchematicLibraryControls filters={filters} facets={facets} />
      <SchematicLibraryStats stats={stats} />

      {filteredSchematics.length > 0 ? (
        <section className={styles.grid}>
          {filteredSchematics.map((schematic) => (
            <SchematicLibraryCard key={schematic.id} schematic={schematic} />
          ))}
        </section>
      ) : (
        <SchematicLibraryEmptyState
          filters={filters}
          totalSchematics={schematics.length}
        />
      )}
    </main>
  );
}
