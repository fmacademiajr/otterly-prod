const REVIEWER_USERNAME = "reviewer";
const REVIEWER_PASSWORD = "otterly-review-2026";

export function checkReviewerCredentials(username: string, password: string): boolean {
  return username === REVIEWER_USERNAME && password === REVIEWER_PASSWORD;
}
