// lib/__tests__/api.test.ts
// Tests for API service layer

import { ApiError, checkHealth, recognizeEquipment } from '../api';

// Mock fetch
global.fetch = jest.fn();

// Mock the backend URL
const MOCK_BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3001';

describe('API Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ApiError', () => {
    it('should create error with message and status code', () => {
      const error = new ApiError('Test error', 404);

      expect(error.message).toBe('Test error');
      expect(error.statusCode).toBe(404);
      expect(error.name).toBe('ApiError');
    });
  });

  describe('checkHealth', () => {
    it('should return health status on success', async () => {
      const mockResponse = {
        status: 'ok',
        openaiConfigured: true,
        authEnabled: false,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await checkHealth();

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${MOCK_BACKEND_URL}/health`,
        expect.objectContaining({
          method: 'GET',
        })
      );
    });

    it('should throw ApiError on failed request', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      await expect(checkHealth()).rejects.toThrow(ApiError);
    });

    it('should throw ApiError on network failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      await expect(checkHealth()).rejects.toThrow(ApiError);
    });
  });

  describe('recognizeEquipment', () => {
    it('should send recognition request and return response', async () => {
      const mockRequest = {
        image_base64: 'base64encodedimage',
      };

      const mockResponse = {
        equipment_type: 'Dumbbell',
        confidence: 'high' as const,
        exercises: [
          {
            name: 'Bicep Curls',
            sets: '3-4',
            reps: '10-12',
            intensity: 'Beginner',
            muscleGroups: ['Biceps'],
            description: 'Curl the dumbbell',
          },
        ],
        recommended_exercises: [],
        ai_used: true,
        from: 'openai' as const,
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await recognizeEquipment(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        `${MOCK_BACKEND_URL}/equipment/recognize`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockRequest),
        })
      );
    });

    it('should throw ApiError on invalid response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({}), // Missing required fields
      });

      await expect(
        recognizeEquipment({ image_base64: 'test' })
      ).rejects.toThrow(ApiError);
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('Aborted');
      abortError.name = 'AbortError';

      (global.fetch as jest.Mock).mockRejectedValueOnce(abortError);

      await expect(
        recognizeEquipment({ image_base64: 'test' })
      ).rejects.toThrow('Request timeout');
    });
  });
});
