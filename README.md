# SALT-LINE 🌊
### Coastal Groundwater Intelligence & Adaptive Monitoring Platform

**Making invisible coastal groundwater risks easier to understand, monitor, and investigate.**

---

## 🌍 About the Project

SALT-LINE is a geospatial intelligence and decision-support platform designed to support the monitoring and investigation of potential saltwater intrusion in coastal groundwater systems.

Saltwater intrusion occurs when seawater moves into freshwater aquifers, threatening drinking water availability, agriculture, and coastal livelihoods.

Because this process takes place underground, identifying vulnerable areas early is challenging.

SALT-LINE brings together geospatial information, satellite-derived environmental indicators, hydrogeological concepts, and explainable assessment methods to help identify locations that may require further investigation.

> **Our goal:** Transform scattered environmental evidence into understandable, location-based groundwater monitoring insights.

## 🎯 Problem Statement

Coastal communities face increasing pressure on freshwater resources due to factors such as:

- Excessive groundwater extraction.
- Sea-level rise and coastal changes.
- Changing rainfall and recharge patterns.
- Limited groundwater monitoring infrastructure.
- Delayed identification of potential saltwater intrusion.

Traditional monitoring can be expensive and spatially limited. SALT-LINE aims to provide an accessible platform for visualising available evidence and prioritising locations for further investigation.

## 💡 Our Approach

SALT-LINE combines multiple information sources and analytical components:

1. **Geospatial Intelligence:** Organises monitoring information by geographical location.
2. **Satellite-Derived Indicators:** Uses environmental indicators such as NDMI to explore vegetation moisture patterns.
3. **Hydrogeological Context:** Uses coastal groundwater principles, including the Ghyben–Herzberg relationship, as scientific context for understanding freshwater–saltwater interactions.
4. **Risk Assessment:** Evaluates available indicators using a weighted assessment framework.
5. **Confidence Assessment:** Represents evidence availability and data coverage.
6. **Monitoring Prioritisation:** Helps identify locations that may deserve closer attention.
7. **Explainable Assessments:** Provides information about contributing indicators, missing data, and assessment limitations.

## ✨ Key Features

- Interactive geospatial dashboard.
- Location-based monitoring information.
- Heatmap-based visualisation of environmental indicators.
- Risk assessment and monitoring prioritisation.
- Confidence and evidence-coverage assessment.
- Explainable assessment results.
- Backend API integration.
- Structured storage of project data.
- Support for distinguishing verified, community-reported, and simulated information.

## 🧪 Scientific Foundation

### Ghyben–Herzberg Principle

The Ghyben–Herzberg principle describes an approximate relationship between the freshwater table above sea level and the freshwater–saltwater interface below sea level in an idealised coastal aquifer.

It provides useful hydrogeological context for understanding why changes in freshwater head can influence the position of the saltwater interface.

The principle is an approximation and does not independently predict real-world saltwater intrusion.

### Satellite-Derived Environmental Indicators

SALT-LINE uses indicators such as the Normalized Difference Moisture Index (NDMI) to examine vegetation moisture patterns.

These indicators can help identify environmental changes, but they do not directly measure groundwater salinity or detect underground seawater.

## 🏗️ System Architecture

The platform is organised into three main layers:

### 1. Frontend
- React
- TypeScript
- Vite
- Tailwind CSS
- Leaflet
- Recharts

Responsible for the interactive dashboard, maps, heatmaps, visualisations, and assessment explanations.

### 2. Backend
- Python
- FastAPI
- Pydantic
- SQLite

Responsible for API endpoints, data handling, database interactions, and communication between the frontend and intelligence layer.

### 3. Intelligence Layer
- Risk assessment engine
- Confidence assessment engine
- Monitoring prioritisation
- Explainability engine
- Assessment pipeline

Responsible for processing available indicators and producing structured assessment results.

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | Tailwind CSS |
| Maps | Leaflet |
| Charts | Recharts |
| Backend | Python, FastAPI |
| Validation | Pydantic |
| Database | SQLite |
| Testing | Pytest |
| Version Control | Git, GitHub |

## 📁 Project Structure

```text
Lavender/
│
├── backend/
│   ├── main.py
│   ├── app/
│   │   ├── assessment_api.py
│   │   ├── community_api.py
│   │   └── geospatial_loader.py
│   └── saltline.db
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   ├── hooks/
│   │   ├── services/
│   │   ├── types.ts
│   │   └── ...
│   ├── package.json
│   └── vite.config.ts
│
├── intelligence/
│   ├── assessment_pipeline.py
│   ├── explanation_engine.py
│   ├── risk_engine.py
│   ├── confidence_engine.py
│   └── tests/
│
└── README.md
```

## 🚀 Getting Started

### Prerequisites

Install the following:

- Python 3.10 or later
- Node.js and npm
- Git

### 1. Clone the Repository

```bash
git clone https://github.com/INNOVEX-26/Lavender.git
cd Lavender
```

### 2. Start the Backend

Create and activate a virtual environment:

**Windows PowerShell**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

Install the backend dependencies using the project's dependency file, if available.

Start the FastAPI server:

```powershell
python -m uvicorn backend.main:app --host 127.0.0.1 --port 8001
```

Backend API:

`http://127.0.0.1:8001`

Interactive API documentation:

`http://127.0.0.1:8001/docs`

### 3. Start the Frontend

Open another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the local development URL printed by Vite in your browser.

The frontend and backend must both be running for the complete application experience.

## 🧪 Testing

Run backend tests from the project root:

```powershell
python -m pytest
```

The project has previously passed 170 backend tests.

## ⚠️ Important Limitations

SALT-LINE is a prototype decision-support platform. Its outputs should not be interpreted as scientifically validated predictions or confirmation of groundwater contamination.

- Satellite-derived indicators are environmental proxies, not direct groundwater measurements.
- The Ghyben–Herzberg principle is an idealised approximation.
- Simulated sensor readings are not real field measurements.
- Community-submitted reports require independent verification.
- Risk and monitoring scores are provisional assessment outputs.
- Missing or unavailable information should not be interpreted as zero or as evidence of safety.

Reliable confirmation of saltwater intrusion requires appropriate groundwater-level and water-quality measurements, repeated field observations, and hydrogeological investigation.

## 🔮 Future Scope

- Integration of validated satellite datasets.
- Integration of real-time groundwater monitoring sensors.
- Improved hydrogeological modelling.
- Historical trend analysis.
- More extensive field-data validation.
- Enhanced explainable assessment methods.
- Deployment for broader coastal monitoring applications.

## 🌱 Expected Impact

SALT-LINE aims to support:

- Earlier investigation of potentially vulnerable coastal locations.
- Better visualisation of environmental evidence.
- More transparent and explainable monitoring assessments.
- Improved prioritisation of field investigations.
- Data-informed coastal groundwater management.

## 👥 Project

**Project Name:** SALT-LINE  
**Project Theme:** Coastal Groundwater Intelligence  
**Repository:** [INNOVEX-26/Lavender](https://github.com/INNOVEX-26/Lavender)

