/**
 * Custom Hook: useCurationSession
 * Manages curation session state and API calls
 */

import { useState, useEffect, useCallback } from 'react';
import curatorService from '../services/curatorService';

export const useCurationSession = (sessionId) => {
  const [session, setSession] = useState(null);
  const [fields, setFields] = useState(null);
  const [currentField, setCurrentField] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fieldPage, setFieldPage] = useState(0);

  // Fetch session data
  useEffect(() => {
    const fetchSessionData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch session details
        const sessionData = await curatorService.getCurationSession(sessionId);
        setSession(sessionData);

        // Fetch first page of fields
        const fieldsData = await curatorService.listSessionFields(
          sessionId,
          0,
          10
        );
        setFields(fieldsData);

        // Set current field to first one
        if (fieldsData && fieldsData.length > 0) {
          setCurrentField(fieldsData[0]);
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchSessionData();
    }
  }, [sessionId]);

  // Select specific field
  const selectField = useCallback(
    async (fieldId) => {
      try {
        const fieldData = await curatorService.getFieldDetails(fieldId);
        setCurrentField(fieldData);
      } catch (err) {
        setError(err.message);
        console.error('Error fetching field:', err);
      }
    },
    []
  );

  // Update field mapping
  const updateFieldMapping = useCallback(
    async (mappingData) => {
      try {
        const updated = await curatorService.updateFieldMapping(
          mappingData.field_id,
          mappingData.standardized_field_name,
          mappingData.mapping_source,
          mappingData.chosen_suggestion_index,
          mappingData.is_manual_entry,
          mappingData.mapping_notes,
          mappingData.curator_user_id || 'curator_user' // Default user ID
        );

        // Update field in local state
        if (fields) {
          const updatedFields = fields.map(f =>
            f.id === mappingData.field_id ? updated : f
          );
          setFields(updatedFields);
        }

        setCurrentField(updated);
        return updated;
      } catch (err) {
        setError(err.message);
        console.error('Error updating field:', err);
        throw err;
      }
    },
    [fields]
  );

  // Get real-time progress
  const getProgress = useCallback(async () => {
    try {
      const progress = await curatorService.getSessionProgress(sessionId);
      return progress;
    } catch (err) {
      setError(err.message);
      console.error('Error fetching progress:', err);
      return null;
    }
  }, [sessionId]);

  // Generate exports
  const generateExports = useCallback(
    async (formats = ['CSV'], curatorUserId = 'curator_user') => {
      try {
        const exports = await curatorService.generateExports(
          sessionId,
          formats,
          false,
          curatorUserId
        );
        return exports;
      } catch (err) {
        setError(err.message);
        console.error('Error generating exports:', err);
        throw err;
      }
    },
    [sessionId]
  );

  // Bulk approve fields
  const bulkApproveFields = useCallback(
    async (fieldIds, minConfidence = 0.85, curatorUserId = 'curator_user') => {
      try {
        const result = await curatorService.bulkApproveFields(
          sessionId,
          fieldIds,
          minConfidence,
          'Bulk approved by curator',
          curatorUserId
        );
        
        // Refresh fields
        const updatedFields = await curatorService.listSessionFields(sessionId);
        setFields(updatedFields);
        
        return result;
      } catch (err) {
        setError(err.message);
        console.error('Error bulk approving:', err);
        throw err;
      }
    },
    [sessionId]
  );

  // Load more fields (pagination)
  const loadMoreFields = useCallback(async () => {
    try {
      const nextPage = fieldPage + 1;
      const moreFields = await curatorService.listSessionFields(
        sessionId,
        nextPage * 10,
        10
      );

      if (moreFields && moreFields.length > 0) {
        setFields([...fields, ...moreFields]);
        setFieldPage(nextPage);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading more fields:', err);
    }
  }, [sessionId, fieldPage, fields]);

  return {
    session,
    fields,
    currentField,
    loading,
    error,
    selectField,
    updateFieldMapping,
    getProgress,
    generateExports,
    bulkApproveFields,
    loadMoreFields,
  };
};

export default useCurationSession;
