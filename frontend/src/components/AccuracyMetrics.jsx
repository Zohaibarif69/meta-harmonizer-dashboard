import React from 'react';
import PropTypes from 'prop-types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

const AccuracyMetrics = ({ metrics }) => {
  const correct = metrics?.correct_mappings ?? 0;
  const total = metrics?.total_mappings ?? 0;
  
  const data = [
    { name: 'Correct', value: correct, fill: '#10b981' },
    { name: 'Incorrect', value: total - correct, fill: '#ef4444' }
  ];

  return (
    <div className="metric-section">
      <h2>Accuracy Metrics</h2>
      <div className="chart-container">
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Bar dataKey="value" radius={[8, 8, 0, 0]}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="metric-details">
        <p><strong>Total Mappings Evaluated:</strong> {total}</p>
        <p><strong>Correct Mappings:</strong> {correct} ({total > 0 ? (correct/total*100).toFixed(1) : 0}%)</p>
        <p><strong>Incorrect Mappings:</strong> {total - correct} ({total > 0 ? ((total - correct)/total*100).toFixed(1) : 0}%)</p>
        <p><strong>High Confidence + Correct (≥0.90):</strong> {metrics?.high_confidence_correct ?? 0}</p>
      </div>
    </div>
  );
};

export default AccuracyMetrics;

AccuracyMetrics.propTypes = {
  metrics: PropTypes.shape({
    total_mappings: PropTypes.number.isRequired,
    correct_mappings: PropTypes.number.isRequired,
    high_confidence_correct: PropTypes.number.isRequired
  }).isRequired
};
