import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, MapPin, Briefcase, ArrowRight, Users } from 'lucide-react'
import { Badge, VerifiedBadge, Pagination } from '@/components/ui'
import { SearchBar } from '@/components/ui/SearchBar'
import { useDebounce } from '@/hooks/useDebounce'
import { JOB_CATEGORIES } from '@/utils/constants'
import { companyService } from '@/services/companyService'

function CompanyCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 animate-pulse">
      <div className="flex items-start gap-4 mb-4">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-slate-100 rounded w-2/3 mb-2" />
          <div className="h-3 bg-slate-50 rounded w-1/2" />
        </div>
      </div>
      <div className="h-3 bg-slate-50 rounded mb-1" />
      <div className="h-3 bg-slate-50 rounded w-4/5 mb-4" />
      <div className="flex gap-3 mb-4">
        <div className="h-3 bg-slate-100 rounded w-16" />
        <div className="h-3 bg-slate-100 rounded w-20" />
      </div>
      <div className="h-6 bg-slate-100 rounded-full w-24" />
    </div>
  )
}

function CompanyCard({ company }) {
  const navigate = useNavigate()
  const initials = company.name?.split(' ').map(w => w[0]).join('').slice(0, 2) || 'CO'
  const openRoles = company._count?.jobs || 0

  return (
    <div
      onClick={() => navigate(`/companies/${company.id}`)}
      className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer group"
    >
      <div className="flex items-start gap-4 mb-4">
        {company.logoUrl ? (
          <img src={company.logoUrl} alt={company.name} className="w-14 h-14 rounded-2xl object-cover border border-slate-100 shrink-0" />
        ) : (
          <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-lg shrink-0">
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">{company.name}</h3>
            {company.isVerified && <VerifiedBadge size="xs" />}
          </div>
          {company.industry && <p className="text-sm text-slate-500 mt-0.5">{company.industry}</p>}
        </div>
      </div>

      {company.description && (
        <p className="text-sm text-slate-600 leading-relaxed mb-4 line-clamp-2">{company.description}</p>
      )}

      <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-4">
        {company.district && <span className="flex items-center gap-1"><MapPin size={11} /> {company.district}</span>}
        {company.size && <span className="flex items-center gap-1"><Users size={11} /> {company.size} employees</span>}
        {company.founded && <span className="flex items-center gap-1"><Briefcase size={11} /> Est. {company.founded}</span>}
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100">
        <Badge variant="success" size="sm">{openRoles} open role{openRoles !== 1 ? 's' : ''}</Badge>
        <span className="flex items-center gap-1 text-xs font-medium text-blue-600 group-hover:gap-1.5 transition-all">
          View Company <ArrowRight size={12} />
        </span>
      </div>
    </div>
  )
}

export default function CompanyDirectory() {
  const [search, setSearch] = useState('')
  const [industry, setIndustry] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebounce(search, 400)

  const { data, isLoading } = useQuery({
    queryKey: ['companies', 'public', { page, search: debouncedSearch, industry }],
    queryFn: () => companyService.getPublicCompanies({
      page,
      limit: 12,
      q: debouncedSearch || undefined,
      industry: industry || undefined,
    }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5,
  })

  const companies = data?.companies || []
  const pagination = data?.pagination || { total: 0, totalPages: 1 }

  const handleSearch = (val) => { setSearch(val); setPage(1) }

  return (
    <div className="pt-16 min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-10">
        <div className="max-w-7xl mx-auto text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Company Directory</h1>
          <p className="text-slate-500">Discover and connect with Nepal's verified top companies</p>
        </div>
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search companies..."
            className="flex-1"
            size="lg"
          />
          <select
            value={industry}
            onChange={(e) => { setIndustry(e.target.value); setPage(1) }}
            className="h-11 text-sm border border-slate-200 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
          >
            <option value="">All Industries</option>
            {JOB_CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-600">
            {isLoading ? '...' : <><strong>{pagination.total}</strong> verified companies</>}
          </p>
          <div className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <ShieldCheck size={13} />
            All companies verified
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 8 }).map((_, i) => <CompanyCardSkeleton key={i} />)
            : companies.map(company => <CompanyCard key={company.id} company={company} />)
          }
        </div>

        {pagination.totalPages > 1 && (
          <div className="flex justify-center mt-10">
            <Pagination page={page} totalPages={pagination.totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  )
}
