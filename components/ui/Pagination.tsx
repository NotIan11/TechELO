'use client'

import Button from './Button'
import Icon from './Icon'

interface PaginationProps {
  page: number
  totalPages: number
  onPage: (page: number) => void
}

export default function Pagination({ page, totalPages, onPage }: PaginationProps) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-between">
      <Button variant="secondary" size="sm" disabled={page === 1} onClick={() => onPage(page - 1)} type="button">
        <Icon name="chevron-left" className="h-4 w-4" /> Previous
      </Button>
      <p className="tabular text-sm text-zinc-400">
        Page {page} of {totalPages}
      </p>
      <Button variant="secondary" size="sm" disabled={page === totalPages} onClick={() => onPage(page + 1)} type="button">
        Next <Icon name="chevron-right" className="h-4 w-4" />
      </Button>
    </div>
  )
}
