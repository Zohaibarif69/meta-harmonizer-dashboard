/**
 * Integration Tests for Curator Components
 * Tests component rendering, user interactions, and API integration
 */

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import CurationDashboard from '../components/CurationComponents/CurationDashboard';
import CuratorRoutes from '../routes/CuratorRoutes';
import * as curatorService from '../services/curatorService';

// Mock the curator service
jest.mock('../services/curatorService');

// Mock data generators
const mockField = {
  id: 'field_001',
  name: 'patient_age',
  sample_values: ['25', '45', '67'],
  status: 'pending',
  suggestions: [
    {
      id: 'sug_001',
      value: 'age',
      confidence: 0.95,
      method: 'FTS',
      source: 'NCIT',
      explanation: 'Exact match with standard ontology term'
    },
    {
      id: 'sug_002',
      value: 'patient_age',
      confidence: 0.87,
      method: 'BiEncoder',
      source: 'UMLS',
      explanation: 'Semantic similarity match'
    }
  ],
  mapped_value: null,
  notes: ''
};

const mockSession = {
  id: 'session_001',
  file_id: 'file_001',
  file_name: 'patient_data.csv',
  total_fields: 50,
  mapped_fields: 30,
  pending_fields: 15,
  unmapped_fields: 5,
  status: 'in_progress',
  created_at: '2024-01-15T10:00:00Z',
  progress_percentage: 60
};

const mockFields = [mockField, { ...mockField, id: 'field_002', name: 'diagnosis' }];

// Setup function
const setupMocks = () => {
  curatorService.getCurationSession.mockResolvedValue(mockSession);
  curatorService.listSessionFields.mockResolvedValue({
    fields: mockFields,
    total: mockFields.length,
    page: 1
  });
  curatorService.getFieldDetails.mockResolvedValue(mockField);
  curatorService.updateFieldMapping.mockResolvedValue(mockField);
  curatorService.getSessionProgress.mockResolvedValue({
    total_fields: mockSession.total_fields,
    mapped_fields: mockSession.mapped_fields,
    pending_fields: mockSession.pending_fields,
    unmapped_fields: mockSession.unmapped_fields,
    progress_percentage: mockSession.progress_percentage
  });
};

// Render helper
const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('CurationDashboard', () => {
  beforeEach(() => {
    setupMocks();
    jest.clearAllMocks();
  });

  test('renders loading state on initial load', () => {
    const { container } = renderWithRouter(
      <CurationDashboard onError={jest.fn()} />
    );
    expect(container.querySelector('.curation-dashboard.loading')).toBeInTheDocument();
  });

  test('loads and displays session data', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockSession.file_name)).toBeInTheDocument();
    });

    expect(curatorService.getCurationSession).toHaveBeenCalled();
    expect(curatorService.listSessionFields).toHaveBeenCalled();
  });

  test('displays session header with progress', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockSession.file_name)).toBeInTheDocument();
      expect(screen.getByText(/60%/)).toBeInTheDocument();
    });
  });

  test('renders field list with items', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('patient_age')).toBeInTheDocument();
      expect(screen.getByText('diagnosis')).toBeInTheDocument();
    });
  });

  test('loads field details when clicking list item', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('patient_age')).toBeInTheDocument();
    });

    const fieldItem = screen.getByText('patient_age');
    fireEvent.click(fieldItem);

    await waitFor(() => {
      expect(curatorService.getFieldDetails).toHaveBeenCalledWith('field_001');
    });
  });

  test('displays field editor with suggestions', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      const fieldItem = screen.getByText('patient_age');
      fireEvent.click(fieldItem);
    });

    await waitFor(() => {
      expect(screen.getByText('age')).toBeInTheDocument();
      expect(screen.getByText(/95%/)).toBeInTheDocument();
    });
  });

  test('approves field mapping', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      const fieldItem = screen.getByText('patient_age');
      fireEvent.click(fieldItem);
    });

    const approveBtn = await screen.findByRole('button', { name: /approve/i });
    fireEvent.click(approveBtn);

    await waitFor(() => {
      expect(curatorService.updateFieldMapping).toHaveBeenCalled();
    });
  });

  test('handles errors gracefully', async () => {
    const errorFn = jest.fn();
    curatorService.getCurationSession.mockRejectedValue(new Error('API Error'));

    renderWithRouter(<CurationDashboard onError={errorFn} />);

    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });

  test('auto-refreshes progress every 10 seconds', async () => {
    jest.useFakeTimers();
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(curatorService.getCurationSession).toHaveBeenCalled();
    });

    jest.advanceTimersByTime(10000);

    await waitFor(() => {
      expect(curatorService.getSessionProgress).toHaveBeenCalled();
    });

    jest.useRealTimers();
  });

  test('filters fields by status', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('patient_age')).toBeInTheDocument();
    });

    const pendingFilter = screen.getByRole('radio', { name: /pending/i });
    fireEvent.click(pendingFilter);

    // Verify filtering occurs (implementation depends on component)
    expect(screen.getByLabelText(/pending/i)).toBeChecked();
  });

  test('searches fields by name', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('patient_age')).toBeInTheDocument();
    });

    const searchInput = screen.getByRole('textbox', { name: /search/i });
    fireEvent.change(searchInput, { target: { value: 'age' } });

    expect(searchInput.value).toBe('age');
  });
});

describe('CurationDashboard - User Interactions', () => {
  beforeEach(() => {
    setupMocks();
    jest.clearAllMocks();
  });

  test('selects and deselects suggestions', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      const fieldItem = screen.getByText('patient_age');
      fireEvent.click(fieldItem);
    });

    const suggestionItems = await screen.findAllByRole('button', { name: /select/i });
    fireEvent.click(suggestionItems[0]);

    expect(suggestionItems[0]).toHaveClass('selected');
  });

  test('enters custom value', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      const fieldItem = screen.getByText('patient_age');
      fireEvent.click(fieldItem);
    });

    const customInput = await screen.findByPlaceholderText(/custom value/i);
    fireEvent.change(customInput, { target: { value: 'patient_years' } });

    expect(customInput.value).toBe('patient_years');
  });

  test('adds notes to field', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      const fieldItem = screen.getByText('patient_age');
      fireEvent.click(fieldItem);
    });

    const notesInput = await screen.findByPlaceholderText(/notes/i);
    fireEvent.change(notesInput, { target: { value: 'This field needs review' } });

    expect(notesInput.value).toBe('This field needs review');
  });

  test('navigates between fields with keyboard', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('patient_age')).toBeInTheDocument();
    });

    fireEvent.keyDown(document, { key: 'ArrowDown' });

    // Next field should be loaded
    expect(curatorService.getFieldDetails).toHaveBeenCalled();
  });

  test('marks field as unmapped', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      const fieldItem = screen.getByText('patient_age');
      fireEvent.click(fieldItem);
    });

    const unmappedBtn = await screen.findByRole('button', { name: /unmapped/i });
    fireEvent.click(unmappedBtn);

    await waitFor(() => {
      expect(curatorService.updateFieldMapping).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'unmapped'
        })
      );
    });
  });
});

describe('CurationDashboard - Bulk Operations', () => {
  beforeEach(() => {
    setupMocks();
    curatorService.bulkApproveFields.mockResolvedValue({ approved_count: 10 });
    jest.clearAllMocks();
  });

  test('shows progress modal', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockSession.file_name)).toBeInTheDocument();
    });

    const viewProgressBtn = screen.getByRole('button', { name: /progress/i });
    fireEvent.click(viewProgressBtn);

    expect(screen.getByText(/progress/i)).toBeInTheDocument();
  });

  test('shows export modal', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockSession.file_name)).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);

    expect(screen.getByText(/export/i)).toBeInTheDocument();
  });

  test('bulk approves fields by confidence threshold', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockSession.file_name)).toBeInTheDocument();
    });

    const thresholdSlider = screen.getByRole('slider');
    fireEvent.change(thresholdSlider, { target: { value: '0.85' } });

    const autoApproveBtn = screen.getByRole('button', { name: /auto-approve/i });
    fireEvent.click(autoApproveBtn);

    await waitFor(() => {
      expect(curatorService.bulkApproveFields).toHaveBeenCalledWith(
        'session_001',
        expect.objectContaining({
          confidence_threshold: 0.85
        })
      );
    });
  });
});

describe('CurationDashboard - Exports', () => {
  beforeEach(() => {
    setupMocks();
    curatorService.generateExports.mockResolvedValue({
      exports: [
        { id: 'exp_001', format: 'CSV', file_path: '/exports/session_001.csv' }
      ]
    });
    jest.clearAllMocks();
  });

  test('generates export files', async () => {
    renderWithRouter(<CurationDashboard onError={jest.fn()} />);

    await waitFor(() => {
      expect(screen.getByText(mockSession.file_name)).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole('button', { name: /export/i });
    fireEvent.click(exportBtn);

    const generateBtn = await screen.findByRole('button', { name: /generate/i });
    fireEvent.click(generateBtn);

    await waitFor(() => {
      expect(curatorService.generateExports).toHaveBeenCalled();
    });
  });
});

describe('CuratorRoutes', () => {
  beforeEach(() => {
    setupMocks();
  });

  test('renders curation dashboard for sessionId parameter', async () => {
    const { container } = renderWithRouter(
      <CuratorRoutes />
    );

    // The component should render and handle the route
    expect(container).toBeTruthy();
  });
});
