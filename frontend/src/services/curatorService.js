/**
 * Curator Workflow API Service
 * Provides all curator-related API calls
 * Uses the base APIClient class for HTTP requests
 */

import APIClient from './api';

const curatorAPI = new APIClient('http://localhost:8000/api/curator');

// ============================================================================
// METADATA OPERATIONS
// ============================================================================

export const uploadMetadataFile = async (file, metadataSource = null) => {
  const formData = new FormData();
  formData.append('file', file);
  if (metadataSource) {
    formData.append('metadata_source', metadataSource);
  }

  return await curatorAPI.request('/metadata/upload', {
    method: 'POST',
    body: formData,
    headers: {}, // Don't set Content-Type for FormData
  });
};

export const listMetadataFiles = async () => {
  return await curatorAPI.request('/metadata/files', {
    method: 'GET',
  });
};

export const getMetadataFile = async (fileId) => {
  return await curatorAPI.request(`/metadata/files/${fileId}`, {
    method: 'GET',
  });
};

// ============================================================================
// CURATION SESSION OPERATIONS
// ============================================================================

export const createCurationSession = async (metadataFileId, curatorUserId) => {
  return await curatorAPI.request('/sessions', {
    method: 'POST',
    body: {
      metadata_file_id: metadataFileId,
      curator_user_id: curatorUserId,
    },
  });
};

export const getCurationSession = async (sessionId) => {
  return await curatorAPI.request(`/sessions/${sessionId}`, {
    method: 'GET',
  });
};

export const getSessionProgress = async (sessionId) => {
  return await curatorAPI.request(`/sessions/${sessionId}/progress`, {
    method: 'GET',
  });
};

// ============================================================================
// FIELD OPERATIONS
// ============================================================================

export const getFieldDetails = async (fieldId) => {
  return await curatorAPI.request(`/fields/${fieldId}`, {
    method: 'GET',
  });
};

export const updateFieldMapping = async (
  fieldId,
  standardizedFieldName,
  mappingSource,
  chosenSuggestionIndex,
  isManualEntry,
  mappingNotes,
  curatorUserId
) => {
  return await curatorAPI.request(`/fields/${fieldId}?curator_user_id=${curatorUserId}`, {
    method: 'PUT',
    body: {
      field_id: fieldId,
      standardized_field_name: standardizedFieldName,
      mapping_source: mappingSource,
      chosen_suggestion_index: chosenSuggestionIndex,
      is_manual_entry: isManualEntry,
      mapping_notes: mappingNotes,
    },
  });
};

export const listSessionFields = async (
  sessionId,
  skip = 0,
  limit = 10,
  statusFilter = null
) => {
  let endpoint = `/sessions/${sessionId}/fields?skip=${skip}&limit=${limit}`;
  if (statusFilter) {
    endpoint += `&status_filter=${statusFilter}`;
  }

  return await curatorAPI.request(endpoint, {
    method: 'GET',
  });
};

// ============================================================================
// BULK OPERATIONS
// ============================================================================

export const bulkApproveFields = async (
  sessionId,
  fieldIds,
  minConfidence,
  curatorNotes,
  curatorUserId
) => {
  return await curatorAPI.request(
    `/sessions/${sessionId}/bulk-approve?curator_user_id=${curatorUserId}`,
    {
      method: 'POST',
      body: {
        field_ids: fieldIds,
        min_confidence: minConfidence,
        curator_notes: curatorNotes,
      },
    }
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export const generateExports = async (
  sessionId,
  formats = ['CSV'],
  includeAuditTrail = false,
  curatorUserId
) => {
  return await curatorAPI.request(
    `/sessions/${sessionId}/export?curator_user_id=${curatorUserId}`,
    {
      method: 'POST',
      body: {
        formats,
        include_audit_trail: includeAuditTrail,
      },
    }
  );
};

// ============================================================================
// AUDIT TRAIL
// ============================================================================

export const getSessionEditHistory = async (sessionId, limit = 50) => {
  return await curatorAPI.request(`/sessions/${sessionId}/edits?limit=${limit}`, {
    method: 'GET',
  });
};

// ============================================================================
// HEALTH CHECK
// ============================================================================

export const healthCheck = async () => {
  try {
    return await curatorAPI.request('/health', {
      method: 'GET',
    });
  } catch (error) {
    return { status: 'unhealthy', error: error.message };
  }
};

export default {
  uploadMetadataFile,
  listMetadataFiles,
  getMetadataFile,
  createCurationSession,
  getCurationSession,
  getSessionProgress,
  getFieldDetails,
  updateFieldMapping,
  listSessionFields,
  bulkApproveFields,
  generateExports,
  getSessionEditHistory,
  healthCheck,
};
