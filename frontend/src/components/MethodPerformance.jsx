import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell, ScatterChart, Scatter } from 'recharts';

const MethodPerformance = ({ metrics }) => {
  const methodData = Object.entries(metrics?.method_performance || {}).map(([method, data]) => ({
    name: method,
    count: data?.count ?? 0,
    avgScore: parseFloat((data?.avg_score ?? 0).toFixed(4)),
    valid: data?.valid ?? 0,
    validPercent: parseFloat((data?.valid_percent ?? 0).toFixed(1))
  }));

  const methodColors = {
    exact: '#3b82f6',
    fuzzy: '#8b5cf6',
    semantic: '#ec4899',
    ontology: '#f59e0b',
    llm: '#10b981'
  };

  return (
    <div className="metric-section">
      <h2>Method Performance Analysis</h2>
      
      <h3>Mapping Methods Overview</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={methodData} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" />
            <YAxis dataKey="name" type="category" width={80} />
            <Tooltip />
            <Bar dataKey="count" fill="#6366f1" radius={[0, 8, 8, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-divider"></div>

      <h3>Average Confidence Score by Method</h3>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={methodData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis domain={[0, 1]} />
            <Tooltip formatter={(value) => value.toFixed(4)} />
            <Bar dataKey="avgScore" radius={[8, 8, 0, 0]}>
              {methodData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={methodColors[entry.name] || '#6366f1'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="section-divider"></div>

      <h3>Detailed Method Breakdown</h3>
      <div className="method-table">
        <table>
          <thead>
            <tr>
              <th>Method</th>
              <th>Count</th>
              <th>Avg Score</th>
              <th>Valid Mappings</th>
              <th>Valid %</th>
              <th>Quality</th>
            </tr>
          </thead>
          <tbody>
            {methodData.map((method, idx) => (
              <tr key={idx}>
                <td>
                  <span className="method-badge" style={{ backgroundColor: methodColors[method.name] || '#6366f1' }}>
                    {method.name}
                  </span>
                </td>
                <td>{method.count}</td>
                <td><strong>{method.avgScore.toFixed(4)}</strong></td>
                <td>{method.valid}</td>
                <td>{method.validPercent}%</td>
                <td>
                  {method.avgScore >= 0.9 && <span className="quality-badge excellent">Excellent</span>}
                  {method.avgScore >= 0.8 && method.avgScore < 0.9 && <span className="quality-badge good">Good</span>}
                  {method.avgScore >= 0.7 && method.avgScore < 0.8 && <span className="quality-badge moderate">Moderate</span>}
                  {method.avgScore < 0.7 && <span className="quality-badge low">Low</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="section-divider"></div>

      <div className="method-analysis">
        <h4>Method Performance Insights</h4>
        <ul>
          {methodData.map((method, idx) => (
            <li key={idx}>
              <strong>{method.name.charAt(0).toUpperCase() + method.name.slice(1)}:</strong> {method.count} mappings with avg confidence {method.avgScore.toFixed(4)}
              {method.validPercent === 0 && ' (all mappings to non-standard fields)'}
            </li>
          ))}
          <li style={{ marginTop: '10px', fontStyle: 'italic', color: '#666' }}>
            Note: Valid percentage shows mappings to fields in the standard ontology. All methods can be improved with curator feedback.
          </li>
        </ul>
      </div>

      <div className="recommendations">
        <h4>Recommendations</h4>
        <ul>
          {methodData.filter(m => m.avgScore >= 0.9).length > 0 && (
            <li>Methods with avg score ≥0.90 ({methodData.filter(m => m.avgScore >= 0.9).map(m => m.name).join(', ')}) are high-confidence candidates for auto-acceptance</li>
          )}
          {methodData.filter(m => m.avgScore < 0.8).length > 0 && (
            <li>Methods with avg score &lt;0.80 ({methodData.filter(m => m.avgScore < 0.8).map(m => m.name).join(', ')}) require additional tuning or curator review</li>
          )}
          <li>Consider ensemble methods combining high-confidence matchers</li>
          <li>Collect curator feedback to improve method weights in future iterations</li>
        </ul>
      </div>
    </div>
  );
};

export default MethodPerformance;
