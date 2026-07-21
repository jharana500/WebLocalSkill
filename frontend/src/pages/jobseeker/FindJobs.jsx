import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin,
  Clock,
  Bookmark,
  BookmarkCheck,
  SlidersHorizontal,
  X,
  Briefcase,
} from "lucide-react";
import { Badge, VerifiedBadge, Pagination, EmptyState } from "@/components/ui";
import { Button } from "@/components/ui";
import { SearchBar } from "@/components/ui/SearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import { JOB_TYPES, EXPERIENCE_LEVELS } from "@/utils/constants";
import { cn } from "@/utils/cn";
import { jobService } from "@/services/jobService";
import { applicationService } from "@/services/applicationService";
import useAuthStore from "@/store/authStore";
import { formatRelativeTime } from "@/utils/formatters";

const JOB_TYPE_LABELS = {
  FULL_TIME: "Full Time",
  PART_TIME: "Part Time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
  REMOTE: "Remote",
  FREELANCE: "Freelance",
};

function JobCardSkeleton() {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 shrink-0" />
        <div className="flex-1">
          <div className="h-4 bg-slate-100 rounded w-1/3 mb-2" />
          <div className="h-3 bg-slate-50 rounded w-1/4 mb-3" />
          <div className="flex gap-2">
            <div className="h-5 bg-slate-100 rounded-full w-16" />
            <div className="h-5 bg-slate-50 rounded w-20" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FindJobs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isJobSeeker = user?.role === "job_seeker";

  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState({ types: [], experience: [] });
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const queryParams = {
    page,
    q: debouncedSearch || undefined,
    jobType: filters.types[0] || undefined,
    experience: filters.experience[0] || undefined,
  };

  const { data, isLoading } = useQuery({
    queryKey: ["jobs", queryParams],
    queryFn: () => jobService.getJobs(queryParams),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  });

  const { data: savedIds = new Set() } = useQuery({
    queryKey: ["saved-jobs", "ids"],
    queryFn: () =>
      applicationService
        .getSavedJobs()
        .then(
          (res) => new Set((res?.savedJobs || res || []).map((s) => s.jobId)),
        ),
    enabled: isJobSeeker,
    staleTime: 1000 * 60 * 5,
  });

  const saveMutation = useMutation({
    mutationFn: (jobId) => applicationService.saveJob(jobId),
    onSuccess: () => queryClient.invalidateQueries(["saved-jobs"]),
  });
  const unsaveMutation = useMutation({
    mutationFn: (jobId) => applicationService.unsaveJob(jobId),
    onSuccess: () => queryClient.invalidateQueries(["saved-jobs"]),
  });

  const toggleSave = (e, jobId) => {
    e.stopPropagation();
    if (!isJobSeeker) {
      navigate("/login");
      return;
    }
    savedIds.has(jobId)
      ? unsaveMutation.mutate(jobId)
      : saveMutation.mutate(jobId);
  };

  const jobs = data?.jobs || [];
  const pagination = data?.pagination || { total: 0, totalPages: 1, page: 1 };
  const activeFilterCount = filters.types.length + filters.experience.length;

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };
  const clearFilters = () => {
    setFilters({ types: [], experience: [] });
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Find Jobs</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isLoading
            ? "Loading jobs..."
            : `${pagination.total.toLocaleString()} jobs from verified companies in Nepal`}
        </p>
      </div>

      <div className="flex gap-3 mb-6">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search jobs, companies, skills..."
          className="flex-1"
          size="lg"
        />
        <Button
          variant={activeFilterCount > 0 ? "outline-primary" : "outline"}
          icon={SlidersHorizontal}
          onClick={() => setShowFilters(!showFilters)}
        >
          Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
        </Button>
      </div>

      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-xl p-5 mb-6 animate-fade-in">
          <div className="flex flex-wrap gap-6">
            {[
              { label: "Job Type", key: "types", options: JOB_TYPES },
              {
                label: "Experience",
                key: "experience",
                options: EXPERIENCE_LEVELS,
              },
            ].map(({ label, key, options }) => (
              <div key={key}>
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  {label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {options.map((opt) => {
                    const active = filters[key].includes(opt.value);
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          setFilters((f) => ({
                            ...f,
                            [key]: active
                              ? f[key].filter((v) => v !== opt.value)
                              : [opt.value],
                          }));
                          setPage(1);
                        }}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                          active
                            ? "bg-blue-600 text-white border-blue-600"
                            : "text-slate-600 border-slate-200 hover:border-blue-300",
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {activeFilterCount > 0 && (
              <div className="flex items-end">
                <button
                  onClick={clearFilters}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:underline"
                >
                  <X size={12} /> Clear all filters
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-600">
          {isLoading ? (
            "..."
          ) : (
            <>
              Showing <strong>{pagination.total}</strong> jobs
            </>
          )}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No jobs found"
          description="Try adjusting your search or clearing filters"
          action={{
            label: "Clear Search",
            onClick: () => {
              setSearch("");
              clearFilters();
            },
          }}
        />
      ) : (
        <>
          <div className="space-y-3">
            {jobs.map((job) => {
              const company = job.company || {};
              const initials =
                company.name
                  ?.split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2) || "??";
              const isSaved = savedIds.has(job.id);
              const salary = job.salaryMin
                ? `NPR ${(job.salaryMin / 1000).toFixed(0)}K${job.salaryMax ? `–${(job.salaryMax / 1000).toFixed(0)}K` : "+"}`
                : null;

              return (
                <div
                  key={job.id}
                  className="bg-white border border-slate-200 rounded-xl p-5 hover:shadow-md hover:border-blue-200/60 transition-all duration-200 group"
                >
                  <div className="flex items-start gap-4">
                    {company.logoUrl ? (
                      <img
                        src={company.logoUrl}
                        alt={company.name}
                        className="w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0">
                        {initials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <button
                            onClick={() =>
                              navigate(`/dashboard/jobs/${job.id}`)
                            }
                            className="font-semibold text-slate-900 hover:text-blue-700 transition-colors text-left"
                          >
                            {job.title}
                          </button>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-slate-600">
                              {company.name}
                            </span>
                            {company.isVerified && <VerifiedBadge size="xs" />}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={(e) => toggleSave(e, job.id)}
                            className={cn(
                              "p-2 rounded-lg transition-colors",
                              isSaved
                                ? "text-blue-600 bg-blue-50"
                                : "text-slate-400 hover:text-blue-600 hover:bg-blue-50",
                            )}
                          >
                            {isSaved ? (
                              <BookmarkCheck size={16} />
                            ) : (
                              <Bookmark size={16} />
                            )}
                          </button>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        <Badge variant="primary" size="sm">
                          {JOB_TYPE_LABELS[job.jobType] || job.jobType}
                        </Badge>
                        {job.district && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <MapPin size={11} /> {job.district}
                          </span>
                        )}
                        {job.experience && (
                          <span className="flex items-center gap-1 text-xs text-slate-500">
                            <Briefcase size={11} /> {job.experience}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs text-slate-500">
                          <Clock size={11} />{" "}
                          {formatRelativeTime(job.createdAt)}
                        </span>
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end gap-2 shrink-0">
                      {salary && (
                        <span className="text-sm font-bold text-slate-900">
                          {salary}
                        </span>
                      )}
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          navigate(`/dashboard/jobs/${job.id}/apply`)
                        }
                      >
                        Apply Now
                      </Button>
                    </div>
                  </div>
                  <div className="md:hidden flex items-center justify-between mt-4 pt-4 border-t border-slate-100">
                    {salary && (
                      <span className="text-sm font-bold text-slate-900">
                        {salary}
                      </span>
                    )}
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() =>
                        navigate(`/dashboard/jobs/${job.id}/apply`)
                      }
                    >
                      Apply
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
          {pagination.totalPages > 1 && (
            <div className="flex justify-center mt-8">
              <Pagination
                page={page}
                totalPages={pagination.totalPages}
                onPageChange={setPage}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
