export type GameType = 'pool' | 'ping_pong'
export type MatchStatus = 'pending_start' | 'in_progress' | 'pending_result' | 'completed' | 'disputed' | 'cancelled' | 'challenge_expired'

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          university_email: string
          display_name: string
          dorm_id: string | null
          created_at: string
          profile_image_url: string | null
          phone_number: string | null
        }
        Insert: {
          id: string
          university_email: string
          display_name: string
          dorm_id?: string | null
          created_at?: string
          profile_image_url?: string | null
          phone_number?: string | null
        }
        Update: {
          id?: string
          university_email?: string
          display_name?: string
          dorm_id?: string | null
          created_at?: string
          profile_image_url?: string | null
          phone_number?: string | null
        }
      }
      dorms: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          total_members: number
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          total_members?: number
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          total_members?: number
        }
      }
      elo_ratings: {
        Row: {
          id: string
          user_id: string
          game_type: GameType
          rating: number
          matches_played: number
          wins: number
          losses: number
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          game_type: GameType
          rating?: number
          matches_played?: number
          wins?: number
          losses?: number
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          game_type?: GameType
          rating?: number
          matches_played?: number
          wins?: number
          losses?: number
          updated_at?: string
        }
      }
      matches: {
        Row: {
          id: string
          game_type: GameType
          player1_id: string
          player2_id: string
          player1_elo_before: number
          player2_elo_before: number
          player1_elo_after: number | null
          player2_elo_after: number | null
          status: MatchStatus
          winner_id: string | null
          player1_start_accepted: boolean
          player2_start_accepted: boolean
          player1_result_accepted: boolean
          player2_result_accepted: boolean
          created_at: string
          started_at: string | null
          completed_at: string | null
        }
        Insert: {
          id?: string
          game_type: GameType
          player1_id: string
          player2_id: string
          player1_elo_before: number
          player2_elo_before: number
          player1_elo_after?: number | null
          player2_elo_after?: number | null
          status?: MatchStatus
          winner_id?: string | null
          player1_start_accepted?: boolean
          player2_start_accepted?: boolean
          player1_result_accepted?: boolean
          player2_result_accepted?: boolean
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
        Update: {
          id?: string
          game_type?: GameType
          player1_id?: string
          player2_id?: string
          player1_elo_before?: number
          player2_elo_before?: number
          player1_elo_after?: number | null
          player2_elo_after?: number | null
          status?: MatchStatus
          winner_id?: string | null
          player1_start_accepted?: boolean
          player2_start_accepted?: boolean
          player1_result_accepted?: boolean
          player2_result_accepted?: boolean
          created_at?: string
          started_at?: string | null
          completed_at?: string | null
        }
      }
      match_disputes: {
        Row: {
          id: string
          match_id: string
          disputed_by: string
          reason: string
          resolved: boolean
          created_at: string
        }
        Insert: {
          id?: string
          match_id: string
          disputed_by: string
          reason: string
          resolved?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          match_id?: string
          disputed_by?: string
          reason?: string
          resolved?: boolean
          created_at?: string
        }
      }
    }
  }
}
