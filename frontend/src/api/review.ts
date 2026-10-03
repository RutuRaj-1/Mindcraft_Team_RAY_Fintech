import { http } from './client';
import { HumanReview, SubmitReviewRequest, FeedbackEvent } from '../types';

export const reviewApi = {
  listReviews: (status?: string, role?: string) =>
    http.get<HumanReview[]>(
      `/reviews${status ? `?status=${encodeURIComponent(status)}` : ''}${role ? `&role=${encodeURIComponent(role)}` : ''}`
    ),

  getReview: (reviewId: string) =>
    http.get<HumanReview>(`/reviews/${reviewId}`),

  getJourneyReviews: (journeyId: string) =>
    http.get<HumanReview[]>(`/journeys/${journeyId}/reviews`),

  startReview: (journeyId: string, notes?: string) =>
    http.post<HumanReview>(`/journeys/${journeyId}/review`, { notes }),

  submitReview: (journeyId: string, reviewId: string, req: SubmitReviewRequest) =>
    http.post<HumanReview>(`/journeys/${journeyId}/review/${reviewId}/submit`, req),

  getFeedbackEvents: (journeyId: string) =>
    http.get<FeedbackEvent[]>(`/journeys/${journeyId}/feedback`),
};
