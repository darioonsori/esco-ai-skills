# AI-related occupations and skills in ESCO

Final project for the course **Data Visualization – Data-Driven Storytelling Website**.

This repository contains:
- a preprocessing pipeline (Jupyter notebooks) that builds an AI-related subset from the ESCO taxonomy,
- an interactive D3.js website that explores how AI skills are linked to occupations in ESCO (core vs optional, shared skills, structure).

---

## Live demo

- GitHub Pages: REPLACE_WITH_GITHUB_PAGES_URL

## Repository

- GitHub repo: REPLACE_WITH_GITHUB_REPO_URL

---

## Project structure
esco-project/
├─ data/
│  ├─ raw/              # original ESCO files (as downloaded)
│  ├─ esco_csv/          # intermediate parsed ESCO tables
│  └─ processed/         # cleaned and filtered datasets
│
├─ notebooks/            # preprocessing and data preparation
│  ├─ esco_parse.ipynb
│  ├─ build_ai_subset.ipynb
│  └─ utils.ipynb
│
├─ output/               # final datasets produced by the pipeline
│  ├─ occupations.csv
│  ├─ skills.csv
│  └─ occupation_skill.csv
│
└─ web/                  # interactive website (D3.js)
├─ assets/            # CSS + JavaScript
├─ data/              # datasets used by the charts
└─ index.html
> Note: the website reads its input data from `web/data/`.

---

## Data sources

This project is based on the **ESCO taxonomy** (European Commission):
- ESCO occupations
- ESCO skills/competences
- ESCO occupation–skill relations, labelled as **essential** or **optional**

Official ESCO website:
https://esco.ec.europa.eu

---

## Methodology (summary)

We analyse ESCO occupation–skill relations as a bipartite structure and focus on an **AI-related subset** (occupations + skills).
The visual story follows this logic:
1. **Core size per occupation** (essential vs optional counts)
2. **Shared core skills** (skills ranked by frequency across occupations)
3. **ISCO context** (where AI-related occupations sit in the hierarchy)
4. **Patterns** (occupation × skill matrix to reveal clusters/specialisation)
5. **Network structure** (clusters and “bridge” skills linking groups)

Important note: this is a **taxonomy-level analysis**. Counts reflect ESCO modelling choices (which links exist and how they are labelled), not labour-market demand or hiring trends.

Data scope choice: we keep only occupations linked to at least **2** AI-related skills (noise reduction threshold).

---

## Operational definitions

- **AI-related skill link (edge)**: one ESCO relation connecting an occupation to an AI-related skill.
  Relations have a `type`: `essential` or `optional`.
- **Occupation total**: for a given occupation, the number of AI-related skill links (essential + optional).
- **Skill frequency**: for a given skill, the number of occupations linked to that skill.
- **ISCO subtree total**: for an ISCO group, the displayed value is the sum of AI-related skill links across all descendant leaf occupations.
- **Matrix cell**: a binary indicator of whether an occupation is linked to a skill in the selected top subset (`1` = link exists, `0` = not shown/absent in the subset).

---

## Preprocessing pipeline

All preprocessing steps are implemented in the notebooks in `notebooks/`.

### 1) Parse ESCO
Notebook: `notebooks/esco_parse.ipynb`

This notebook:
- loads the raw ESCO tables,
- extracts occupations, skills and relations,
- normalises labels and identifiers,
- exports structured/intermediate tables into `data/esco_csv/` and `data/processed/`.

### 2) Build the AI-related subset + final datasets
Notebook: `notebooks/build_ai_subset.ipynb`

This notebook:
- selects AI-related occupations and skills,
- filters relations to keep only links within this subset,
- applies the minimum-links threshold (>= 2 AI-related skills per occupation),
- produces final datasets used by the website.

Outputs are written to:
- `output/occupations.csv`
- `output/skills.csv`
- `output/occupation_skill.csv`

### 3) Utilities
Notebook: `notebooks/utils.ipynb`

Helper functions for cleaning, filtering and formatting.

---

## Datasets used by the website

The website loads CSV files from `web/data/` (copied from `output/`).

Main files:
- `occupations.csv` – list of AI-related occupations
- `skills.csv` – list of AI-related skills
- `occupation_skill.csv` – occupation–skill relations (including `essential` / `optional`)

---

## How to reproduce the preprocessing

1. Open Jupyter in the project folder.
2. Run notebooks in this order:
   1. `notebooks/esco_parse.ipynb`
   2. `notebooks/build_ai_subset.ipynb`

The pipeline regenerates the files in `output/`.

---

## How to run the website locally

Option A (Python built-in server):

```bash
cd web
python3 -m http.server 8000
Then open:
http://localhost:8000

Option B (VS Code Live Server):
	•	Open the web/ folder in VS Code
	•	Run Live Server on web/index.html
Tech stack
	•	HTML / CSS / JavaScript
	•	D3.js (v7)
	•	Jupyter notebooks (Python) for preprocessing
Team
	•	Dario Onsori 