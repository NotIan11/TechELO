/**
 * ELO Rating Calculation
 * 
 * Standard ELO formula: R' = R + K * (S - E)
 * Where:
 * - R' = new rating
 * - R = current rating
 * - K = K-factor (32 for this implementation)
 * - S = actual score (1 for win, 0 for loss)
 * - E = expected score = 1 / (1 + 10^((R2 - R1) / 400))
 */

const K_FACTOR = 32
const INITIAL_RATING = 1500

export interface EloResult {
  newRating1: number
  newRating2: number
  ratingChange1: number
  ratingChange2: number
}

/**
 * Calculate expected score for player 1
 */
export function calculateExpectedScore(rating1: number, rating2: number): number {
  return 1 / (1 + Math.pow(10, (rating2 - rating1) / 400))
}

/**
 * Calculate new ELO ratings after a match
 * @param rating1 Current rating of player 1
 * @param rating2 Current rating of player 2
 * @param winner 1 if player 1 won, 2 if player 2 won
 * @returns New ratings and rating changes
 */
export function calculateElo(
  rating1: number,
  rating2: number,
  winner: 1 | 2
): EloResult {
  const expectedScore1 = calculateExpectedScore(rating1, rating2)
  const expectedScore2 = 1 - expectedScore1

  const actualScore1 = winner === 1 ? 1 : 0
  const actualScore2 = winner === 2 ? 1 : 0

  const newRating1 = Math.round(rating1 + K_FACTOR * (actualScore1 - expectedScore1))
  const newRating2 = Math.round(rating2 + K_FACTOR * (actualScore2 - expectedScore2))

  return {
    newRating1,
    newRating2,
    ratingChange1: newRating1 - rating1,
    ratingChange2: newRating2 - rating2,
  }
}

/**
 * Get initial rating for new players
 */
export function getInitialRating(): number {
  return INITIAL_RATING
}

/**
 * Get K-factor (adjustable if needed)
 */
export function getKFactor(): number {
  return K_FACTOR
}
