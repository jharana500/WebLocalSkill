import { useState } from 'react'
import { Modal } from '@/components/ui/Modal'
import { Button, Select } from '@/components/ui'
import { Textarea } from '@/components/ui/Input'

const ACTION_COPY = {
  'under-review': {
    title: 'Mark under review',
    confirmLabel: 'Mark Under Review',
    confirmVariant: 'primary',
    requireReason: false,
    body: (company) => `Move ${company?.name || 'this company'} into under-review status?`,
  },
  verify: {
    title: 'Verify company',
    confirmLabel: 'Verify Company',
    confirmVariant: 'primary',
    requireReason: false,
    body: (company) => `Confirm that ${company?.name || 'this company'} is a legitimate, verified business. They will receive a verified badge and can publish jobs.`,
  },
  reject: {
    title: 'Reject verification',
    confirmLabel: 'Reject',
    confirmVariant: 'danger',
    requireReason: true,
    reasonLabel: 'Rejection reason',
    reasonHint: 'This reason is shown to the company owner — keep it factual and actionable.',
    body: (company) => `Reject the verification request for ${company?.name || 'this company'}.`,
  },
  'mark-duplicate': {
    title: 'Mark as duplicate',
    confirmLabel: 'Mark Duplicate',
    confirmVariant: 'danger',
    requireReason: true,
    requireTarget: true,
    reasonLabel: 'Reason',
    reasonHint: 'Explain what matched (registration number, name, domain, etc.).',
    body: (company) => `Mark ${company?.name || 'this company'} as a possible duplicate of an existing company. It will not be deleted.`,
  },
  restore: {
    title: 'Restore company',
    confirmLabel: 'Restore',
    confirmVariant: 'primary',
    requireReason: false,
    body: (company) => `Reopen the verification request for ${company?.name || 'this company'}.`,
  },
}

export function CompanyReviewModal({ open, onClose, action, company, matches = [], onConfirm, loading }) {
  const [reason, setReason] = useState('')
  const [duplicateOfCompanyId, setDuplicateOfCompanyId] = useState('')
  const [restoreStatus, setRestoreStatus] = useState('PENDING')
  const [validationError, setValidationError] = useState('')

  if (!open || !action) return null
  const copy = ACTION_COPY[action]
  if (!copy) return null

  const handleClose = () => {
    setReason('')
    setDuplicateOfCompanyId('')
    setRestoreStatus('PENDING')
    setValidationError('')
    onClose()
  }

  const handleConfirm = () => {
    if (copy.requireReason && reason.trim().length < 5) {
      setValidationError('Reason must be at least 5 characters')
      return
    }
    if (copy.requireTarget && !duplicateOfCompanyId) {
      setValidationError('Select the company this is a duplicate of')
      return
    }
    setValidationError('')
    const payload = { reason: reason.trim() || undefined }
    if (action === 'mark-duplicate') payload.duplicateOfCompanyId = duplicateOfCompanyId
    if (action === 'restore') payload.status = restoreStatus
    onConfirm(payload)
  }

  return (
    <Modal open={open} onClose={handleClose} title={copy.title} size="md">
      <p className="text-sm text-slate-600 mb-4">{copy.body(company)}</p>

      {validationError && (
        <p className="text-sm text-red-600 mb-3">{validationError}</p>
      )}

      {copy.requireTarget && (
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Matched company</label>
          <Select
            value={duplicateOfCompanyId}
            onChange={(e) => setDuplicateOfCompanyId(e.target.value)}
            placeholder="Select a matched company"
          >
            {matches.map((m) => (
              <option key={m.companyId} value={m.companyId}>
                {m.companyName} — score {m.score} ({m.riskLevel})
              </option>
            ))}
          </Select>
        </div>
      )}

      {action === 'restore' && (
        <div className="mb-4">
          <label className="text-sm font-medium text-slate-700 block mb-1.5">Restore to</label>
          <Select value={restoreStatus} onChange={(e) => setRestoreStatus(e.target.value)}>
            <option value="PENDING">Pending</option>
            <option value="UNDER_REVIEW">Under Review</option>
          </Select>
        </div>
      )}

      {(copy.requireReason || action === 'under-review' || action === 'verify' || action === 'restore') && (
        <Textarea
          label={copy.reasonLabel || 'Notes (optional)'}
          hint={copy.reasonHint}
          rows={3}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          required={copy.requireReason}
        />
      )}

      <div className="flex gap-3 justify-end mt-6">
        <Button variant="outline" onClick={handleClose} disabled={loading}>Cancel</Button>
        <Button
          variant={copy.confirmVariant === 'danger' ? 'outline-danger' : 'primary'}
          onClick={handleConfirm}
          loading={loading}
          disabled={loading}
        >
          {copy.confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
