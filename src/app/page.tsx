import Link from "next/link";

const EXAMPLES = [
  {
    title: "Crystal Structure Analysis",
    description: "Upload a .cif file and ask about space groups, bond lengths, and coordination",
    query: "Analyze the symmetry of this crystal structure and identify the coordination environment of each cation site",
  },
  {
    title: "Battery Cycling Data",
    description: "Upload potentiostat data (.mpr, .csv) and get capacity fade analysis",
    query: "Plot the voltage profiles and coulombic efficiency over cycling, and identify any degradation mechanisms",
  },
  {
    title: "Phase Stability Screening",
    description: "Ask about thermodynamic stability of a composition",
    query: "Is Li₃PS₄ stable against decomposition? What's the electrochemical stability window vs Li/Li⁺?",
  },
  {
    title: "XRD Pattern Matching",
    description: "Upload powder diffraction data and identify phases",
    query: "Index these XRD peaks and identify what phases are present in this sample",
  },
];

export default function Home() {
  return (
    <main className="min-h-screen">
      {/* Hero */}
      <div className="max-w-5xl mx-auto px-6 pt-20 pb-16">
        <div className="text-center">
          <h1 className="text-5xl font-bold tracking-tight text-gray-900 mb-4">
            Spinel Arena
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-2">
            See what domain expertise does for AI-powered materials science.
          </p>
          <p className="text-gray-500 max-w-2xl mx-auto mb-10">
            Upload your data and compare standard Claude against Claude + Spinel
            side-by-side. Same model, same data — different results.
          </p>
          <Link
            href="/arena"
            className="inline-flex items-center px-8 py-3 rounded-lg bg-spinel-600 hover:bg-spinel-700 text-white font-medium text-lg transition-colors"
          >
            Try the Arena →
          </Link>
        </div>
      </div>

      {/* What is Spinel */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="text-2xl mb-3">🔬</div>
            <h3 className="text-gray-900 font-semibold mb-2">Domain Skills</h3>
            <p className="text-gray-500 text-sm">
              7 specialized skill sets covering crystallography, phase diagrams,
              electronic structure, XRD, spectroscopy, battery analysis, and
              instrument data parsing.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="text-2xl mb-3">🗄️</div>
            <h3 className="text-gray-900 font-semibold mb-2">Live Databases</h3>
            <p className="text-gray-500 text-sm">
              Connected to Materials Project (150K+ materials), AFLOW, and NOMAD.
              Real thermodynamic data, not hallucinated properties.
            </p>
          </div>
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <div className="text-2xl mb-3">📦</div>
            <h3 className="text-gray-900 font-semibold mb-2">Current APIs</h3>
            <p className="text-gray-500 text-sm">
              Bundled reference docs ensure Claude uses current pymatgen and mp-api
              patterns, not deprecated imports from training data.
            </p>
          </div>
        </div>
      </div>

      {/* Example queries */}
      <div className="max-w-5xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
          Try these examples
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {EXAMPLES.map((ex) => (
            <Link
              key={ex.title}
              href={`/arena?q=${encodeURIComponent(ex.query)}`}
              className="bg-white rounded-xl p-5 border border-gray-200 hover:border-spinel-600 transition-colors group shadow-sm"
            >
              <h3 className="text-gray-900 font-semibold mb-1 group-hover:text-spinel-500 transition-colors">
                {ex.title}
              </h3>
              <p className="text-gray-500 text-sm mb-3">{ex.description}</p>
              <p className="text-gray-400 text-sm italic">"{ex.query}"</p>
            </Link>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-8">
        <div className="max-w-5xl mx-auto px-6 flex justify-between items-center text-sm text-gray-500">
          <span>
            Built with{" "}
            <a
              href="https://github.com/charlesxjyang/spinel-plugin"
              className="text-gray-600 hover:text-gray-900"
            >
              Spinel
            </a>
          </span>
          <span>Charles Yang</span>
        </div>
      </footer>
    </main>
  );
}
