/** Maps the stable error codes raised by the migration-013 poker RPCs to user copy + HTTP status. */

type RpcErrorLike = { code?: string; message?: string } | string | null | undefined

function messageOf(err: RpcErrorLike): string {
  if (!err) return ''
  return typeof err === 'string' ? err : err.message ?? ''
}

function codeOf(err: RpcErrorLike): string {
  if (!err || typeof err === 'string') return ''
  return err.code ?? ''
}

const MESSAGES: [string, string][] = [
  ['NOT_AUTHENTICATED', 'Please sign in.'],
  ['SESSION_NOT_FOUND', 'Session not found.'],
  ['ENTRY_NOT_FOUND', 'This entry no longer exists — the session may have been edited. Refresh and try again.'],
  ['NOT_HOST', 'Only the host can change this session.'],
  ['NOT_OFFICER', 'Only poker club officers can do that.'],
  ['NOT_YOUR_ENTRY', 'You can only respond to your own entry.'],
  ['LIVE_SESSION_EXISTS', 'You already have a live session. Finish or void it first.'],
  ['WRONG_STATUS', 'This session is not in a state that allows that action.'],
  ['STALE_VERSION', 'The session changed on another device. Reload to see the latest ledger.'],
  ['NOT_DISPUTED', 'You have not disputed this entry.'],
  ['INVALID_KIND', 'Session type must be cash or tournament.'],
  ['INVALID_PLAYED_AT', 'Session date must be in the past.'],
  ['INVALID_SCHEDULED_FOR', 'Scheduled time is invalid.'],
  ['INVALID_DURATION', 'Duration must be between 1 minute and 72 hours.'],
  ['INVALID_PRIZE_POOL', 'Prize pool is only valid for tournaments.'],
  ['INVALID_TEXT', 'Title, stakes, location or notes are too long.'],
  ['INVALID_ENTRIES', 'Ledger data is malformed.'],
  ['INVALID_ENTRY', 'Each row needs a player.'],
  ['TOO_FEW_PLAYERS', 'A session needs at least 2 players.'],
  ['TOO_MANY_PLAYERS', 'A session can have at most 100 players.'],
  ['INVALID_AMOUNT', 'Amounts must be whole cents between $0 and $100,000.'],
  ['MISSING_CASH_OUT', 'Every player needs a cash-out before you can log the session — enter 0 for anyone who busted.'],
  ['UNKNOWN_USER', 'One of the players does not exist.'],
  ['DUPLICATE_PLAYER', 'Each player can only appear once per session.'],
  ['INVALID_PLACE', 'Finishing places must be unique and between 1 and the number of players.'],
  ['EMPTY_SESSION', 'A cash session needs at least one buy-in.'],
  ['INVALID_REASON', 'Please give a short reason (up to 500 characters).'],
  ['INVALID_SPONSOR', 'One of the selected sponsors does not exist.'],
  ['SPONSOR_IN_USE', 'That sponsor is attached to a tournament and cannot be deleted.'],
  ['INVALID_SORT', 'Unknown sort.'],
]

export function pokerRpcErrorMessage(err: RpcErrorLike): string {
  const msg = messageOf(err)
  for (const [code, text] of MESSAGES) {
    if (msg.includes(code)) return text
  }
  const code = codeOf(err)
  if (code === '23505') return 'Each player can only appear once per session.'
  if (code === '23514') return 'Amounts must be whole cents between $0 and $100,000.'
  if (code === '22P02' || code === '22003') return 'Invalid session data.'
  return msg || 'Something went wrong.'
}

export function pokerRpcErrorStatus(err: RpcErrorLike): number {
  const msg = messageOf(err)
  if (msg.includes('NOT_AUTHENTICATED')) return 401
  if (msg.includes('_NOT_FOUND')) return 404
  if (msg.includes('NOT_HOST') || msg.includes('NOT_YOUR_ENTRY') || msg.includes('NOT_OFFICER')) return 403
  if (
    msg.includes('WRONG_STATUS') ||
    msg.includes('STALE_VERSION') ||
    msg.includes('DUPLICATE_PLAYER') ||
    msg.includes('LIVE_SESSION_EXISTS') ||
    msg.includes('SPONSOR_IN_USE')
  ) {
    return 409
  }
  return 400
}
