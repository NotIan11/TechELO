import { redirect } from 'next/navigation'

// Redirect /leaderboard to home page (which now shows the leaderboard)
export default function LeaderboardPage() {
  redirect('/')
}
