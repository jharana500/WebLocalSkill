import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, UserCheck, UserX } from "lucide-react";
import {
  Badge,
  EmptyState,
  Avatar,
  Pagination,
  Alert,
  Button,
} from "@/components/ui";
import { SearchBar } from "@/components/ui/SearchBar";
import { useDebounce } from "@/hooks/useDebounce";
import { formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import { applicationService } from "@/services/applicationService";

const STATUS_STYLES = {
  PENDING: "bg-blue-50 text-blue-700 border-blue-200",
  REVIEWING: "bg-amber-50 text-amber-700 border-amber-200",
  SHORTLISTED: "bg-purple-50 text-purple-700 border-purple-200",
  HIRED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-red-50 text-red-700 border-red-200",
  WITHDRAWN: "bg-slate-50 text-slate-500 border-slate-200",
};
const STATUS_LABELS = {
  PENDING: "Applied",
  REVIEWING: "Under Review",
  SHORTLISTED: "Shortlisted",
  HIRED: "Hired",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const STATUS_TABS = [
  "all",
  "PENDING",
  "REVIEWING",
  "SHORTLISTED",
  "HIRED",
  "REJECTED",
];

function normalizeApplication(application) {
  const profile =
    application?.user?.profile ||
    application?.applicant?.profile ||
    application?.jobSeeker?.profile ||
    {};
  const applicant =
    application?.applicant || application?.user || application?.jobSeeker || {};
  const profileName = [profile?.firstName, profile?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    id: application?.id,
    raw: application,
    profile,
    applicantName:
      profileName ||
      applicant?.fullName ||
      applicant?.name ||
      applicant?.email ||
      "Unknown Applicant",
    applicantEmail: applicant?.email || "No email",
    avatarUrl: profile?.avatarUrl || applicant?.avatarUrl || null,
    district: profile?.district || applicant?.district || "",
    jobTitle: application?.job?.title || "Untitled Job",
    status: application?.status || "PENDING",
    appliedAt: application?.appliedAt || application?.createdAt || null,
  };
}

function getApplicationsPayload(data) {
  const applications = data?.data?.applications || data?.applications || [];
  const pagination = data?.data?.pagination ||
    data?.pagination || { page: 1, limit: 10, total: 0, totalPages: 0 };
  return {
    applications: Array.isArray(applications)
      ? applications.map(normalizeApplication)
      : [],
    pagination: {
      page: Number(pagination?.page || 1),
      limit: Number(pagination?.limit || 10),
      total: Number(pagination?.total || 0),
      totalPages: Number(pagination?.totalPages || 0),
    },
  };
}

export default function Applicants() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [activeStatus, setActiveStatus] = useState("all");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [
      "company",
      "applicants",
      { page, activeStatus, search: debouncedSearch },
    ],
    queryFn: () =>
      applicationService.getCompanyApplications({
        page,
        limit: 10,
        status: activeStatus !== "all" ? activeStatus : undefined,
        search: debouncedSearch || undefined,
      }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) =>
      applicationService.updateApplicationStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries(["company", "applicants"]),
  });

  const { applications, pagination } = getApplicationsPayload(data);

  useEffect(() => {
    if (isError) console.error("COMPANY_APPLICATIONS_LOAD_ERROR:", error);
  }, [isError, error]);

  const handleSearch = (val) => {
    setSearch(val);
    setPage(1);
  };
  const handleTabChange = (tab) => {
    setActiveStatus(tab);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Applicants</h1>
        <p className="text-slate-500 text-sm mt-1">
          {isLoading
            ? "Loading..."
            : `${pagination.total} total applicants across all jobs`}
        </p>
      </div>

      <div className="flex flex-wrap gap-3 mb-5">
        <SearchBar
          value={search}
          onChange={handleSearch}
          placeholder="Search applicants..."
          className="flex-1 min-w-48 max-w-sm"
        />
      </div>

      <div className="flex gap-1 mb-5 overflow-x-auto pb-1">
        {STATUS_TABS.map((s) => (
          <button
            key={s}
            onClick={() => handleTabChange(s)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all border",
              activeStatus === s
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300",
            )}
          >
            {s === "all" ? "All" : STATUS_LABELS[s]}
          </button>
        ))}
      </div>

      {isError && (
        <Alert
          type="error"
          title="Could not load applicants"
          message={error?.message || "Please try again."}
          className="mb-5"
        />
      )}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
        <div className="divide-y divide-slate-100">
          {isError ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm text-slate-500 mb-4">
                Applicants could not be loaded.
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-4 px-5 py-4 animate-pulse"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-slate-100 rounded w-1/3 mb-1" />
                  <div className="h-3 bg-slate-50 rounded w-1/4" />
                </div>
                <div className="h-6 bg-slate-100 rounded-full w-20" />
              </div>
            ))
          ) : applications.length === 0 ? (
            <EmptyState
              icon={UserCheck}
              title="No applicants found"
              size="sm"
            />
          ) : (
            applications.map((app) => {
              const name = app.applicantName;
              const jobTitle = app.jobTitle;
              return (
                <div
                  key={app.id}
                  onClick={() => navigate(`/company/applicants/${app.id}`)}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50 cursor-pointer transition-colors group"
                >
                  {app.avatarUrl ? (
                    <img
                      src={app.avatarUrl}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <Avatar name={name} size="md" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900 group-hover:text-blue-700 transition-colors">
                      {name}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {app.district && `${app.district} · `}
                      Applied for:{" "}
                      <span className="text-slate-600 font-medium">
                        {jobTitle}
                      </span>
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span
                      className={cn(
                        "text-xs font-medium px-2 py-0.5 rounded-full border",
                        STATUS_STYLES[app.status] || STATUS_STYLES.PENDING,
                      )}
                    >
                      {STATUS_LABELS[app.status] || app.status}
                    </span>
                    <span className="text-xs text-slate-400">
                      {app.appliedAt
                        ? formatRelativeTime(app.appliedAt)
                        : "Unknown date"}
                    </span>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    {["PENDING", "REVIEWING"].includes(app.status) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatusMutation.mutate({
                            id: app.id,
                            status: "SHORTLISTED",
                          });
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                        title="Shortlist"
                      >
                        <UserCheck size={15} />
                      </button>
                    )}
                    {!["REJECTED", "WITHDRAWN"].includes(app.status) && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateStatusMutation.mutate({
                            id: app.id,
                            status: "REJECTED",
                          });
                        }}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Reject"
                      >
                        <UserX size={15} />
                      </button>
                    )}
                    <button className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <ChevronRight size={15} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
        {pagination.totalPages > 1 && (
          <div className="flex justify-center p-5 border-t border-slate-100">
            <Pagination
              page={page}
              totalPages={pagination.totalPages}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>
    </div>
  );
}
