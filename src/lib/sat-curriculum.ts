/**
 * The SAT as the College Board organises it, which is also how a teacher
 * talks about it and how the official question bank is laid out.
 *
 * 10 Reading & Writing skills across 4 domains, 19 Math skills across 4.
 * Keeping the official names matters: a student who practises "Boundaries"
 * here should recognise the word on a score report.
 */

export type SkillSeed = { name: string; slug: string; description: string };
export type DomainSeed = { name: string; skills: SkillSeed[] };
export type SubjectSeed = {
  name: string;
  slug: string;
  blurb: string;
  accent: string;
  domains: DomainSeed[];
};

export const SAT_CURRICULUM: SubjectSeed[] = [
  {
    name: "Reading & Writing",
    slug: "reading-writing",
    blurb: "Comprehension, rhetoric and the rules of standard English.",
    accent: "violet",
    domains: [
      {
        name: "Information and Ideas",
        skills: [
          {
            name: "Central Ideas and Details",
            slug: "central-ideas-and-details",
            description: "Find what a text is mainly saying, and the details that carry it.",
          },
          {
            name: "Command of Evidence",
            slug: "command-of-evidence",
            description: "Pick the fact, quotation or figure that actually supports a claim.",
          },
          {
            name: "Inferences",
            slug: "inferences",
            description: "Complete a text with the conclusion it most logically points to.",
          },
        ],
      },
      {
        name: "Craft and Structure",
        skills: [
          {
            name: "Words in Context",
            slug: "words-in-context",
            description: "Choose the word the sentence needs, not the one you know best.",
          },
          {
            name: "Text Structure and Purpose",
            slug: "text-structure-and-purpose",
            description: "Say why a text is built the way it is, and what a part is doing.",
          },
          {
            name: "Cross-Text Connections",
            slug: "cross-text-connections",
            description: "Put two texts side by side and work out how they answer each other.",
          },
        ],
      },
      {
        name: "Expression of Ideas",
        skills: [
          {
            name: "Rhetorical Synthesis",
            slug: "rhetorical-synthesis",
            description: "Use given notes to meet a stated goal in one sentence.",
          },
          {
            name: "Transitions",
            slug: "transitions",
            description: "Signal the real relationship between two sentences.",
          },
        ],
      },
      {
        name: "Standard English Conventions",
        skills: [
          {
            name: "Boundaries",
            slug: "boundaries",
            description: "Where sentences end and clauses join — punctuation that carries meaning.",
          },
          {
            name: "Form, Structure, and Sense",
            slug: "form-structure-and-sense",
            description: "Agreement, tense, pronouns and modifiers that hold a sentence together.",
          },
        ],
      },
    ],
  },
  {
    name: "Math",
    slug: "math",
    blurb: "Algebra through trigonometry, in the four domains the test reports on.",
    accent: "sky",
    domains: [
      {
        name: "Algebra",
        skills: [
          { name: "Linear equations in one variable", slug: "linear-equations-one-variable", description: "Solve, and recognise when there is no solution or infinitely many." },
          { name: "Linear functions", slug: "linear-functions", description: "Slope, intercepts, and reading a line as a rate of change." },
          { name: "Linear equations in two variables", slug: "linear-equations-two-variables", description: "Move between equation, table and graph." },
          { name: "Systems of two linear equations in two variables", slug: "systems-of-two-linear-equations", description: "Substitution, elimination, and what the intersection means." },
          { name: "Linear inequalities in one or two variables", slug: "linear-inequalities", description: "Solution regions, boundary lines and constraints in context." },
        ],
      },
      {
        name: "Advanced Math",
        skills: [
          { name: "Equivalent expressions", slug: "equivalent-expressions", description: "Factor, expand and rewrite without changing value." },
          { name: "Nonlinear equations in one variable and systems of equations in two variables", slug: "nonlinear-equations-and-systems", description: "Quadratics, radicals and rational equations, and where curves meet." },
          { name: "Nonlinear functions", slug: "nonlinear-functions", description: "Quadratic, exponential and polynomial behaviour, and their graphs." },
        ],
      },
      {
        name: "Problem-Solving and Data Analysis",
        skills: [
          { name: "Ratios, rates, proportional relationships, and units", slug: "ratios-rates-proportions-units", description: "Scale a relationship and carry the units through." },
          { name: "Percentages", slug: "percentages", description: "Increase, decrease, and percent of a percent." },
          { name: "One-variable data: Distributions and measures of center and spread", slug: "one-variable-data", description: "Mean, median, range and standard deviation, and what skew does to them." },
          { name: "Two-variable data: Models and scatterplots", slug: "two-variable-data", description: "Lines and curves of best fit, and predicting from them." },
          { name: "Probability and conditional probability", slug: "probability", description: "Two-way tables and the probability of one thing given another." },
          { name: "Inference from sample statistics and margin of error", slug: "inference-and-margin-of-error", description: "What a sample can and cannot tell you about a population." },
          { name: "Evaluating statistical claims: Observational studies and experiments", slug: "evaluating-statistical-claims", description: "When a study supports cause, and when it only supports association." },
        ],
      },
      {
        name: "Geometry and Trigonometry",
        skills: [
          { name: "Area and volume", slug: "area-and-volume", description: "Plane and solid figures, including composite shapes." },
          { name: "Lines, angles, and triangles", slug: "lines-angles-triangles", description: "Parallel lines, angle relationships, similarity and congruence." },
          { name: "Right triangles and trigonometry", slug: "right-triangles-and-trigonometry", description: "Pythagoras, special triangles, sine, cosine and tangent." },
          { name: "Circles", slug: "circles", description: "Arcs, sectors, central and inscribed angles, and the equation of a circle." },
        ],
      },
    ],
  },
];

export const SKILL_COUNT = SAT_CURRICULUM.reduce(
  (n, s) => n + s.domains.reduce((m, d) => m + d.skills.length, 0),
  0,
);
