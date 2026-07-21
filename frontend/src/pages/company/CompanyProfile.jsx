import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Edit2,
  Upload,
  MapPin,
  Globe,
  Users,
  Calendar,
  Save,
} from "lucide-react";
import { Button, VerifiedBadge, Alert } from "@/components/ui";
import { Input, Textarea, Select } from "@/components/ui/Input";
import { JOB_CATEGORIES, NEPAL_DISTRICTS } from "@/utils/constants";
import { companyService } from "@/services/companyService";

const COMPANY_SIZES = ["1–10", "10–50", "50–200", "200–500", "500+"];

export default function CompanyProfile() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const logoInputRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ["company", "profile"],
    queryFn: () => companyService.getProfile(),
    staleTime: 1000 * 60 * 5,
    onSuccess: (res) => {
      const c = res?.company || res;
      setFormData({
        name: c.name || "",
        tagline: c.tagline || "",
        description: c.description || "",
        industry: c.industry || "",
        size: c.size || "",
        founded: c.founded || "",
        district: c.district || "",
        website: c.website || "",
        email: c.email || "",
        phone: c.phone || "",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data) => companyService.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries(["company", "profile"]);
      setEditing(false);
      setSuccessMsg("Profile updated successfully!");
      setTimeout(() => setSuccessMsg(null), 3000);
    },
  });

  const logoMutation = useMutation({
    mutationFn: (file) => companyService.uploadLogo(file),
    onSuccess: () => queryClient.invalidateQueries(["company", "profile"]),
  });

  const handleLogoChange = (e) => {
    const file = e.target.files?.[0];
    if (file) logoMutation.mutate(file);
  };

  const handleSave = () => {
    if (!formData) return;
    updateMutation.mutate(formData);
  };

  const company = data?.company || data;
  const isVerified = company?.isVerified;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto animate-pulse space-y-5">
        <div className="h-8 bg-slate-100 rounded w-48" />
        <div className="bg-white border border-slate-200 rounded-xl p-6 h-40" />
        <div className="bg-white border border-slate-200 rounded-xl p-5 h-32" />
        <div className="bg-white border border-slate-200 rounded-xl p-5 h-48" />
      </div>
    );
  }

  const displayData =
    editing && formData
      ? formData
      : {
          name: company?.name || "",
          tagline: company?.tagline || "",
          description: company?.description || "",
          industry: company?.industry || "",
          size: company?.size || "",
          founded: company?.founded || "",
          district: company?.district || "",
          website: company?.website || "",
          email: company?.email || "",
          phone: company?.phone || "",
        };

  const set = (field) => (e) =>
    setFormData((f) => ({ ...f, [field]: e.target.value }));

  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-slate-900">Company Profile</h1>
        <Button
          variant={editing ? "primary" : "outline"}
          icon={editing ? Save : Edit2}
          onClick={editing ? handleSave : () => setEditing(true)}
          disabled={updateMutation.isPending}
        >
          {updateMutation.isPending
            ? "Saving..."
            : editing
              ? "Save Changes"
              : "Edit Profile"}
        </Button>
      </div>

      {successMsg && (
        <Alert
          type="success"
          title="Profile updated!"
          message={successMsg}
          className="mb-5"
          dismissible
        />
      )}
      {updateMutation.isError && (
        <Alert
          type="error"
          message={updateMutation.error?.message || "Failed to save"}
          className="mb-5"
        />
      )}

      <div className="space-y-5">
        {/* Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6">
          <div className="flex items-start gap-5">
            <div className="relative">
              {company?.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="w-20 h-20 rounded-2xl object-cover border-2 border-slate-200"
                />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-700 font-bold text-2xl">
                  {company?.name
                    ?.split(" ")
                    .map((w) => w[0])
                    .join("")
                    .slice(0, 2) || "CO"}
                </div>
              )}
              {editing && (
                <>
                  <button
                    onClick={() => logoInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white hover:bg-blue-700"
                    disabled={logoMutation.isPending}
                  >
                    <Upload size={11} />
                  </button>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoChange}
                  />
                </>
              )}
            </div>
            <div className="flex-1">
              {editing ? (
                <div className="space-y-3">
                  <Input
                    label="Company Name"
                    value={displayData.name}
                    onChange={set("name")}
                  />
                  <Input
                    label="Tagline"
                    value={displayData.tagline}
                    onChange={set("tagline")}
                    placeholder="e.g. Building world-class software from Nepal"
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-xl font-bold text-slate-900">
                      {displayData.name}
                    </h2>
                    {isVerified && <VerifiedBadge />}
                  </div>
                  {displayData.tagline && (
                    <p className="text-slate-600 mt-1">{displayData.tagline}</p>
                  )}
                  <div className="flex flex-wrap gap-3 mt-3 text-sm text-slate-500">
                    {displayData.district && (
                      <span className="flex items-center gap-1.5">
                        <MapPin size={14} /> {displayData.district}
                      </span>
                    )}
                    {displayData.size && (
                      <span className="flex items-center gap-1.5">
                        <Users size={14} /> {displayData.size} employees
                      </span>
                    )}
                    {displayData.founded && (
                      <span className="flex items-center gap-1.5">
                        <Calendar size={14} /> Founded {displayData.founded}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {displayData.website && (
                      <a
                        href={displayData.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-colors"
                      >
                        <Globe size={15} />
                      </a>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* About */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            About the Company
          </h3>
          {editing ? (
            <Textarea
              value={displayData.description}
              onChange={set("description")}
              rows={5}
              label="Company Description"
              placeholder="Describe your company, culture, and mission..."
            />
          ) : (
            <p className="text-sm text-slate-600 leading-relaxed">
              {displayData.description ||
                "No description yet. Click Edit Profile to add one."}
            </p>
          )}
        </div>

        {/* Company Info */}
        <div className="bg-white border border-slate-200 rounded-xl p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Company Information
          </h3>
          {editing ? (
            <div className="grid sm:grid-cols-2 gap-4">
              <Select
                label="Industry"
                value={displayData.industry}
                onChange={set("industry")}
              >
                <option value="">Select industry</option>
                {JOB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </Select>
              <Select
                label="Company Size"
                value={displayData.size}
                onChange={set("size")}
              >
                <option value="">Select size</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s} employees
                  </option>
                ))}
              </Select>
              <Input
                label="Founded Year"
                value={displayData.founded}
                onChange={set("founded")}
                type="number"
                placeholder="e.g. 2010"
              />
              <Select
                label="Location"
                value={displayData.district}
                onChange={set("district")}
              >
                <option value="">Select district</option>
                {NEPAL_DISTRICTS.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </Select>
              <Input
                label="Website"
                type="url"
                value={displayData.website}
                onChange={set("website")}
                className="sm:col-span-2"
                placeholder="https://example.com"
              />
              <Input
                label="Careers Email"
                type="email"
                value={displayData.email}
                onChange={set("email")}
              />
              <Input
                label="Phone"
                value={displayData.phone}
                onChange={set("phone")}
              />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {[
                { label: "Industry", value: displayData.industry },
                {
                  label: "Company Size",
                  value: displayData.size
                    ? `${displayData.size} employees`
                    : null,
                },
                { label: "Founded", value: displayData.founded },
                {
                  label: "Location",
                  value: displayData.district
                    ? `${displayData.district}, Nepal`
                    : null,
                },
                { label: "Website", value: displayData.website },
                { label: "Email", value: displayData.email },
              ].map(
                ({ label, value }) =>
                  value && (
                    <div key={label}>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-wide">
                        {label}
                      </p>
                      <p className="text-sm text-slate-900 mt-1">{value}</p>
                    </div>
                  ),
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
