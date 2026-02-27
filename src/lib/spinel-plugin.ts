/**
 * Fetches and caches content from the spinel-plugin GitHub repo.
 *
 * - SKILL.md: the materials science skill content (YAML frontmatter stripped)
 * - setup.py: parsed to extract the REQUIREMENTS package list
 *
 * Cached in-memory with a 1-hour TTL. Falls back to hardcoded content on failure.
 */

const GITHUB_RAW_BASE =
  "https://raw.githubusercontent.com/charlesxjyang/spinel-plugin/main";

const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry<T> {
  value: T;
  fetchedAt: number;
}

let skillCache: CacheEntry<string> | null = null;
let packageCache: CacheEntry<string[]> | null = null;

function isFresh<T>(entry: CacheEntry<T> | null): entry is CacheEntry<T> {
  return entry !== null && Date.now() - entry.fetchedAt < CACHE_TTL_MS;
}

function stripFrontmatter(md: string): string {
  const match = md.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (match) {
    return md.slice(match[0].length).trimStart();
  }
  return md;
}

// Hardcoded fallbacks (current content, used if GitHub is unreachable)
const FALLBACK_SKILL_CONTENT = `<skills>
<skill name="crystal-structure-analysis">
## Critical Rules
1. ALWAYS use pymatgen.core.structure.Structure, never the deprecated pymatgen.Structure path
2. For CIF files: Structure.from_file("path.cif")
3. Always report space group with both Hermann-Mauguin symbol AND number
4. Check for partial occupancy before running analysis — disordered structures need special handling
5. When comparing structures, use StructureMatcher with appropriate tolerances (ltol=0.2, stol=0.3, angle_tol=5 as defaults)
6. Report lattice parameters as a, b, c (Å) and α, β, γ (°)
7. For coordination analysis, use CrystalNN (not VoronoiNN) as default — it's more robust
</skill>

<skill name="phase-diagrams">
## Critical Rules
1. ALWAYS check E_hull (energy above hull) — this is the primary stability metric
2. E_hull = 0 means thermodynamically stable. E_hull < 0.025 eV/atom is metastable but potentially synthesizable
3. Use MaterialsProjectCompatibility() corrections before building phase diagrams
4. For Pourbaix diagrams, always specify the ion concentration (default 1e-6 M is often too low)
5. Phase diagrams from DFT are at 0K — real stability may differ at operating temperature
6. When reporting decomposition products, include the reaction energy
</skill>

<skill name="electronic-structure">
## Critical Rules
1. PBE systematically underestimates band gaps — always note this caveat
2. For accurate gaps, check if HSE06 or GW data is available in Materials Project
3. Band gap types matter: direct vs indirect affects optical properties
4. When plotting band structures, always label high-symmetry k-points
5. DOS should be plotted with both total and element-projected contributions
6. Fermi level is set to 0 eV in band structure plots by convention
</skill>

<skill name="xrd-analysis">
## Critical Rules
1. Always specify radiation source (Cu Kα λ=1.5406Å is most common, also Mo Kα, Co Kα)
2. Peak positions in 2θ depend on wavelength — always state which
3. Use Scherrer equation for crystallite size only as rough estimate (±30%)
4. For phase identification, match at least 3 major peaks before claiming a phase
5. Preferred orientation can dramatically change relative intensities
</skill>

<skill name="battery-analysis">
## Critical Rules
1. Always specify battery chemistry — Li-ion, Na-ion, solid-state, etc.
2. Report capacities normalized correctly — mAh/g (gravimetric) requires accurate active mass
3. Coulombic efficiency > 99.9% is needed for practical cells — plot CE on expanded scale
4. Formation cycles (first 1-3) should be analyzed separately from steady-state cycling
5. For Biologic .mpr files: use galvani.BioLogic.MPRfile
6. For Arbin/Maccor: use cellpy.cellreader
7. EIS fitting: always start with a physically meaningful equivalent circuit, not arbitrary elements
</skill>

<skill name="instrument-data">
## Critical Rules
1. Always detect file format before attempting to parse
2. Bruker OPUS (.0, .1, etc): use brukeropusreader
3. JCAMP-DX (.jdx, .dx): use jcamp
4. Gatan (.dm3, .dm4): use hyperspy.load()
5. TIFF with metadata (.tif from microscopes): use tifffile, check for OME-TIFF
6. SPC (.spc): use spc_spectra
7. Always preserve and report instrument metadata (acquisition parameters, calibration)
</skill>

<skill name="materials-screening">
## Critical Rules
1. Always filter by E_hull for stability — unstable materials are rarely useful
2. Include both experimental AND computed data when available
3. Band gap searches: specify if optical or fundamental gap is needed
4. For high-throughput searches, use mp-api's MPRester with field selection to minimize data transfer
5. Cross-reference multiple databases when possible (MP, AFLOW, NOMAD)
</skill>
</skills>`;

const FALLBACK_PACKAGES = [
  "pymatgen",
  "mp-api",
  "ase",
  "pycalphad",
  "matgl",
  "cellpy",
  "galvani",
  "impedance",
  "tifffile",
  "jcamp",
  "brukeropusreader",
];

/**
 * Fetch SKILL.md from GitHub, strip frontmatter, cache for 1 hour.
 */
export async function getSkillContent(): Promise<string> {
  if (isFresh(skillCache)) {
    return skillCache.value;
  }

  try {
    const res = await fetch(`${GITHUB_RAW_BASE}/SKILL.md`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const raw = await res.text();
    const content = stripFrontmatter(raw);

    console.log(
      `[spinel-plugin] Fetched SKILL.md (${content.length} bytes)`
    );

    skillCache = { value: content, fetchedAt: Date.now() };
    return content;
  } catch (err) {
    console.warn(
      `[spinel-plugin] Failed to fetch SKILL.md, using fallback:`,
      err instanceof Error ? err.message : err
    );
    return FALLBACK_SKILL_CONTENT;
  }
}

/**
 * Fetch setup.py from GitHub, parse the REQUIREMENTS list, cache for 1 hour.
 * Returns bare package names (version specifiers stripped).
 */
export async function getPackageList(): Promise<string[]> {
  if (isFresh(packageCache)) {
    return packageCache.value;
  }

  try {
    const res = await fetch(`${GITHUB_RAW_BASE}/setup.py`, {
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const text = await res.text();

    // Extract the REQUIREMENTS list: lines between `REQUIREMENTS = [` and `]`
    const match = text.match(/REQUIREMENTS\s*=\s*\[([\s\S]*?)\]/);
    if (!match) throw new Error("Could not find REQUIREMENTS in setup.py");

    const packages = match[1]
      .split("\n")
      .map((line) => line.replace(/#.*$/, "").trim()) // strip comments
      .filter((line) => line.startsWith('"') || line.startsWith("'"))
      .map((line) => {
        // Remove quotes and trailing comma
        const pkg = line.replace(/['"]/g, "").replace(/,\s*$/, "");
        // Strip version specifiers (>=, ==, etc.)
        return pkg.replace(/[><=!~].*$/, "").trim();
      })
      .filter(Boolean);

    console.log(
      `[spinel-plugin] Parsed ${packages.length} packages from setup.py`
    );

    packageCache = { value: packages, fetchedAt: Date.now() };
    return packages;
  } catch (err) {
    console.warn(
      `[spinel-plugin] Failed to fetch setup.py, using fallback:`,
      err instanceof Error ? err.message : err
    );
    return FALLBACK_PACKAGES;
  }
}
