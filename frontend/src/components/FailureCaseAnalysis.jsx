import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const FailureCaseAnalysis = ({ metrics }) => {
  const invalid = metrics?.invalid_count ?? 0;
  const lowConf = metrics?.low_confidence_count ?? 0;
  const total = metrics?.total_mappings ?? 1;

  const failureData = [
    { category: 'Invalid Mappings', count: invalid, description: 'Target field not in standard ontology', color: '#ef4444' },
    { category: 'Low Confidence', count: lowConf, description: 'Score < 0.70', color: '#f97316' }
  ];

  const totalFailures = invalid + lowConf;
  const failureRate = (totalFailures / total * 100).toFixed(1);

  return (
    <div className="metric-section">
      <h2>Failure Case Analysis</h2>
      
      <div className="failure-overview">
        <div className="failure-stat">
          <h4>Total Failure Cases</h4>
          <p className="failure-value">{totalFailures}</p>
          <p className="failure-percent">{failureRate}% of mappings</p>
        </div>
        <div className="failure-stat">
          <h4>Invalid Mappings</h4>
          <p className="failure-value">{invalid}</p>
          <p className="failure-description">Not in standard fields</p>
        </div>
        <div className="failure-stat">
          <h4>Low Confidence</h4>
          <p className="failure-value">{lowConf}</p>
          <p className="failure-description">Score &lt; 0.70</p>
        </div>
      </div>

      <div className="section-divider"></div>

      <h3>Failure Distribution</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={failureData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis />
            <Tooltip formatter={(value) => `${value} mappings`} />
            <Bar dataKey="count" radius={[8, 8, 0, 0]}>
              {failureData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-divider"></div>

      <h3>Failure Categories</h3>
      <div className="failure-categories">
        <div className="category-card alert">
          <h4>Invalid Mappings</h4>
          <p><strong>Count:</strong> {invalid}</p>
          <p><strong>Percentage:</strong> {(invalid/total*100).toFixed(1)}%</p>
          <div className="category-description">
            <p>Mappings where the predicted target field does not exist in the standard ontology or curated metadata schema.</p>
            <h5>Root Causes:</h5>
            <ul>
              <li>Mapper predicting fields outside standard schema</li>
              <li>Source columns with unclear semantic meaning</li>
              <li>Limited training/reference data for specific domains</li>
              <li>Overfitting to transient or dataset-specific patterns</li>
            </ul>
          </div>
        </div>

        <div className="category-card warning">
          <h4>Low Confidence Mappings</h4>
          <p><strong>Count:</strong> {lowConf}</p>
          <p><strong>Percentage:</strong> {(lowConf/total*100).toFixed(1)}%</p>
          <div className="category-description">
            <p>Valid mappings (target exists in standard schema) but with confidence score &lt; 0.70.</p>
            <h5>Potential Issues:</h5>
            <ul>
              <li>Ambiguous column names or descriptions</li>
              <li>Values don't match expected patterns</li>
              <li>Source data quality issues</li>
              <li>Multiple equally plausible target fields</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="section-divider"></div>

      <div className="remediation-steps">
        <h4>Remediation & Next Steps</h4>
        <table className="remediation-table">
          <thead>
            <tr>
              <th>Issue Type</th>
              <th>Recommended Action</th>
              <th>Priority</th>
              <th>Effort</th>
            </tr>
          </thead>
          <tbody>
            <tr className="alert-row">
              <td>Invalid Mappings ({invalid})</td>
              <td>
                1. Review mapper output for schema coverage
                <br/>2. Expand standard schema if mappings are valid
                <br/>3. Adjust mapper weights to avoid out-of-schema predictions
              </td>
              <td>High</td>
              <td>Medium</td>
            </tr>
            <tr className="warning-row">
              <td>Low Confidence ({lowConf})</td>
              <td>
                1. Manual curator review and correction
                <br/>2. Improve source data quality/documentation
                <br/>3. Collect feedback to retrain mapper
                <br/>4. Consider multi-top matches for ambiguous cases
              </td>
              <td>Medium</td>
              <td>Low</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="section-divider"></div>

      <div className="quality-recommendations">
        <h4>Quality Improvement Plan</h4>
        <ol>
          <li><strong>Immediate:</strong> Mark all {invalid} invalid mappings for curator review</li>
          <li><strong>Short-term:</strong> Retrain mapper with corrected mappings as ground truth</li>
          <li><strong>Medium-term:</strong> Implement iterative learning loop with curator feedback</li>
          <li><strong>Long-term:</strong> Build domain-specific matcher for improved accuracy</li>
          <li><strong>Ongoing:</strong> Monitor mapper performance on new datasets</li>
        </ol>
      </div>
    </div>
  );
};

export default FailureCaseAnalysis;
