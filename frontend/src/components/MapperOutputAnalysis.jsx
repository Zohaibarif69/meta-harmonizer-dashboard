import React from 'react';

const MapperOutputAnalysis = ({ metrics }) => {
  return (
    <div className="metric-section">
      <h2>Detailed Mapper Output Analysis</h2>

      <div className="section-divider"></div>

      <h3>Raw Metrics Data</h3>
      <div className="metrics-json">
        <pre>{JSON.stringify(metrics, null, 2)}</pre>
      </div>

      <div className="section-divider"></div>

      <h3>Evaluation Methodology</h3>
      <div className="methodology-section">
        <h4>How MetaHarmonizer Evaluation Works</h4>
        <ol>
          <li>
            <strong>Input:</strong> Schema mapper output CSV with columns:
            <code>query, stage, method, match1, match1_score, match2, match2_score, match3, match3_score</code>
          </li>
          <li>
            <strong>Validation:</strong> Compare <code>match1</code> (best prediction) against gold standard schema
          </li>
          <li>
            <strong>Accuracy:</strong> Percentage of predictions matching gold standard fields
          </li>
          <li>
            <strong>Confidence:</strong> Analyze <code>match1_score</code> distribution across the pipeline
          </li>
          <li>
            <strong>Method Analysis:</strong> Evaluate each matching stage (exact, fuzzy, semantic, LLM) independently
          </li>
          <li>
            <strong>Failure Cases:</strong> Identify invalid predictions and low-confidence mappings
          </li>
        </ol>
      </div>

      <div className="section-divider"></div>

      <h3>Four-Stage Matching Pipeline</h3>
      <div className="pipeline-explanation">
        <div className="pipeline-stage">
          <h4>Stage 1: Dictionary Matching</h4>
          <p><strong>Methods:</strong> Exact, Fuzzy</p>
          <p>Fast, deterministic matching using field name dictionaries and aliases. Best for standard or well-known columns.</p>
          <p className="stage-metrics">Typical Accuracy: {metrics.method_performance.exact?.avg_score ? (metrics.method_performance.exact.avg_score * 100).toFixed(0) : 'N/A'}% (exact), {metrics.method_performance.fuzzy?.avg_score ? (metrics.method_performance.fuzzy.avg_score * 100).toFixed(0) : 'N/A'}% (fuzzy)</p>
        </div>

        <div className="pipeline-stage">
          <h4>Stage 2: Value/Ontology Matching</h4>
          <p><strong>Methods:</strong> Value Dictionary, Ontology Lookups</p>
          <p>Analyzes actual column values and checks against biomedical ontologies (NCIt, UMLS). Effective for domain-specific columns.</p>
          <p className="stage-metrics">Typical Accuracy: {metrics.method_performance.ontology?.avg_score ? (metrics.method_performance.ontology.avg_score * 100).toFixed(0) : 'N/A'}%</p>
        </div>

        <div className="pipeline-stage">
          <h4>Stage 3: Semantic Matching</h4>
          <p><strong>Methods:</strong> Semantic Embeddings, Numeric Pattern Matching</p>
          <p>Uses transformer-based embeddings to find semantically similar fields. Handles transformed or renamed columns.</p>
          <p className="stage-metrics">Typical Accuracy: {metrics.method_performance.semantic?.avg_score ? (metrics.method_performance.semantic.avg_score * 100).toFixed(0) : 'N/A'}%</p>
        </div>

        <div className="pipeline-stage">
          <h4>Stage 4: LLM Fallback</h4>
          <p><strong>Methods:</strong> Large Language Model (GPT/Llama)</p>
          <p>Final fallback using generative AI to make educated guesses for ambiguous or novel columns. Slowest but most flexible.</p>
          <p className="stage-metrics">Typical Accuracy: {metrics.method_performance.llm?.avg_score ? (metrics.method_performance.llm.avg_score * 100).toFixed(0) : 'N/A'}%</p>
        </div>
      </div>

      <div className="section-divider"></div>

      <h3>Key Definitions</h3>
      <div className="definitions">
        <div className="definition-item">
          <h5>Accuracy</h5>
          <p>Percentage of mappings where <code>match1</code> field exists in the standard/curated schema</p>
        </div>
        <div className="definition-item">
          <h5>Confidence Score</h5>
          <p>Model confidence in the prediction, range [0, 1]. Higher = more confident in the match</p>
        </div>
        <div className="definition-item">
          <h5>Stage</h5>
          <p>Which matching pipeline stage produced this mapping (1-4). Earlier stages are faster; later stages are more flexible</p>
        </div>
        <div className="definition-item">
          <h5>Method</h5>
          <p>Specific algorithm used within a stage (exact, fuzzy, semantic, ontology, llm)</p>
        </div>
        <div className="definition-item">
          <h5>Invalid Mapping</h5>
          <p>Predicted field does not exist in the standard/curated schema</p>
        </div>
        <div className="definition-item">
          <h5>Low Confidence Mapping</h5>
          <p>Valid mapping but with confidence score &lt; 0.70 — candidates for curator review</p>
        </div>
      </div>

      <div className="section-divider"></div>

      <h3>Integration with cBioPortal</h3>
      <div className="integration-info">
        <p>The MetaHarmonizer pipeline maps custom clinical metadata to cBioPortal's standardized schema, enabling:</p>
        <ul>
          <li>Harmonization of multi-institutional datasets</li>
          <li>Integration into cBioPortal for pan-cancer analysis</li>
          <li>Automated QC and schema validation</li>
          <li>Curator feedback loops for continuous improvement</li>
        </ul>
      </div>
    </div>
  );
};

export default MapperOutputAnalysis;
