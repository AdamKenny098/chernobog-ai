import Link from "next/link";

import type {
  VisualSchematicLibraryFacets,
  VisualSchematicLibraryFilters,
} from "../../visual-library/types";
import styles from "./schematicVisualLibrary.module.css";

type SchematicLibraryControlsProps = {
  filters: VisualSchematicLibraryFilters;
  facets: VisualSchematicLibraryFacets;
};

export function SchematicLibraryControls({
  filters,
  facets,
}: SchematicLibraryControlsProps) {
  return (
    <form className={styles.libraryControls} action="/schematics">
      <div className={styles.searchRowLarge}>
        <input
          className={styles.searchInputLarge}
          name="q"
          defaultValue={filters.q}
          placeholder="Search name, tag, theme, version, mod..."
        />

        <select
          className={styles.selectInput}
          name="sort"
          defaultValue={filters.sort}
          aria-label="Sort schematics"
        >
          <option value="created-desc">Newest first</option>
          <option value="created-asc">Oldest first</option>
          <option value="name-asc">Name A-Z</option>
          <option value="name-desc">Name Z-A</option>
          <option value="blocks-desc">Most blocks</option>
          <option value="blocks-asc">Fewest blocks</option>
          <option value="size-desc">Largest volume</option>
          <option value="size-asc">Smallest volume</option>
        </select>
      </div>

      <div className={styles.filterGrid}>
        <FilterSelect
          label="Status"
          name="status"
          value={filters.status}
          options={facets.statuses}
        />
        <FilterSelect
          label="Category"
          name="category"
          value={filters.category}
          options={facets.categories}
        />
        <FilterSelect
          label="Theme"
          name="theme"
          value={filters.theme}
          options={facets.themes}
        />
        <FilterSelect
          label="Version"
          name="version"
          value={filters.version}
          options={facets.versions}
        />
        <FilterSelect
          label="Tag"
          name="tag"
          value={filters.tag}
          options={facets.tags.slice(0, 80)}
        />
      </div>

      <div className={styles.controlActions}>
        <button className={styles.primaryButton} type="submit">
          Apply filters
        </button>
        <Link className={styles.secondaryButton} href="/schematics">
          Reset
        </Link>
      </div>
    </form>
  );
}

function FilterSelect({
  label,
  name,
  value,
  options,
}: {
  label: string;
  name: string;
  value: string;
  options: { value: string; label: string; count: number }[];
}) {
  return (
    <label className={styles.filterField}>
      <span>{label}</span>
      <select className={styles.selectInput} name={name} defaultValue={value}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label} ({option.count})
          </option>
        ))}
      </select>
    </label>
  );
}
