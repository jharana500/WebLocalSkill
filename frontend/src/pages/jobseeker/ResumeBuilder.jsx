import { useState, useEffect } from "react";
import { pdf } from "@react-pdf/renderer";
import {
  Download,
  Save,
  GraduationCap,
  Mail,
  Phone,
  MapPin,
  Plus,
  Trash2,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button, Alert } from "@/components/ui";
import { Input, Textarea } from "@/components/ui/Input";
import { cn } from "@/utils/cn";
import { resumeService } from "@/services/resumeService";
import useAuthStore from "@/store/authStore";
import { toast } from "@/store/uiStore";
import ResumePDFDocument from "./ResumePDFDocument";

const tabs = ["Personal", "Experience", "Education", "Skills", "Preview"];

function ResumePreview({ data }) {
  const expList = (data.experience || []).filter(
    (exp) =>
      exp.role ||
      exp.company ||
      exp.startDate ||
      exp.endDate ||
      exp.description,
  );
  const eduList = (data.education || []).filter(
    (edu) => edu.degree || edu.institution || edu.startYear || edu.endYear,
  );
  const skills = data.skills
    ? data.skills
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];

  return (
    <div
      className="bg-white border border-slate-200 rounded-xl p-8 font-sans text-sm"
      style={{ minHeight: 600 }}
    >
      <div className="border-b-2 border-blue-600 pb-4 mb-5">
        <h1 className="text-2xl font-bold text-slate-900">
          {data.name || "Your Name"}
        </h1>
        <p className="text-slate-600 mt-0.5">{data.title || "Your Title"}</p>
        <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
          {data.email && (
            <span className="flex items-center gap-1">
              <Mail size={10} /> {data.email}
            </span>
          )}
          {data.phone && (
            <span className="flex items-center gap-1">
              <Phone size={10} /> {data.phone}
            </span>
          )}
          {data.location && (
            <span className="flex items-center gap-1">
              <MapPin size={10} /> {data.location}
            </span>
          )}
        </div>
      </div>
      {data.summary && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-1">
            Summary
          </h3>
          <p className="text-slate-600 leading-relaxed">{data.summary}</p>
        </div>
      )}
      {expList.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
            Experience
          </h3>
          <div className="space-y-3">
            {expList.map((exp, i) => (
              <div key={i}>
                <div className="flex justify-between">
                  <p className="font-semibold text-slate-900">
                    {exp.role || "Role"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {exp.startDate || ""}
                    {exp.startDate && (exp.endDate || exp.isCurrent)
                      ? " - "
                      : ""}
                    {exp.isCurrent ? "Present" : exp.endDate || ""}
                  </p>
                </div>
                {exp.company && (
                  <p className="text-slate-500 text-xs">{exp.company}</p>
                )}
                {exp.description && (
                  <p className="text-xs text-slate-500 mt-1">
                    {exp.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {eduList.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
            Education
          </h3>
          {eduList.map((edu, i) => (
            <div key={i}>
              <p className="font-semibold text-slate-900">
                {edu.degree || "Degree"}
              </p>
              <p className="text-slate-500 text-xs">
                {edu.institution || ""}
                {edu.startYear || edu.endYear
                  ? ` · ${edu.startYear || ""} - ${edu.endYear || ""}`
                  : ""}
              </p>
            </div>
          ))}
        </div>
      )}
      {skills.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
            Skills
          </h3>
          <div className="flex flex-wrap gap-1.5">
            {skills.map((s) => (
              <span
                key={s}
                className="px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full border border-blue-200"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const BLANK_EXP = {
  role: "",
  company: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
};
const BLANK_EDU = { degree: "", institution: "", startYear: "", endYear: "" };

function toResumePayload(data) {
  const skills =
    typeof data.skills === "string"
      ? data.skills
          .split(",")
          .map((skill) => skill.trim())
          .filter(Boolean)
      : Array.isArray(data.skills)
        ? data.skills
        : [];

  return {
    title: data.title || "Resume",
    summary: data.summary || "",
    personalData: {
      name: data.name || "",
      title: data.title || "",
      email: data.email || "",
      phone: data.phone || "",
      location: data.location || "",
      portfolio: data.portfolio || "",
    },
    name: data.name || "",
    email: data.email || "",
    phone: data.phone || "",
    location: data.location || "",
    portfolio: data.portfolio || "",
    experience: (data.experience || []).filter(
      (exp) =>
        exp.role ||
        exp.company ||
        exp.startDate ||
        exp.endDate ||
        exp.description,
    ),
    education: (data.education || []).filter(
      (edu) => edu.degree || edu.institution || edu.startYear || edu.endYear,
    ),
    skills,
    projects: Array.isArray(data.projects) ? data.projects : [],
    certifications: Array.isArray(data.certifications)
      ? data.certifications
      : [],
  };
}

export default function ResumeBuilder() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [validationError, setValidationError] = useState("");
  const [data, setData] = useState({
    name: "",
    title: "",
    email: "",
    phone: "",
    location: "",
    portfolio: "",
    summary: "",
    experience: [{ ...BLANK_EXP }],
    education: [{ ...BLANK_EDU }],
    skills: "",
  });

  const { data: resumeData, isLoading } = useQuery({
    queryKey: ["resume", "me"],
    queryFn: () => resumeService.getMyResume(),
    staleTime: 1000 * 60 * 5,
  });

  useEffect(() => {
    if (dataLoaded || !resumeData) return undefined;

    const timer = window.setTimeout(() => {
      const resume = resumeData?.resume;
      if (resume) {
        const personal = resume.personalData || {};
        setData({
          name: personal.name || "",
          title: personal.title || resume.title || "",
          email: personal.email || user?.email || "",
          phone: personal.phone || "",
          location: personal.location || "",
          portfolio: personal.portfolio || "",
          summary: resume.summary || "",
          experience:
            Array.isArray(resume.experience) && resume.experience.length
              ? resume.experience
              : [{ ...BLANK_EXP }],
          education:
            Array.isArray(resume.education) && resume.education.length
              ? resume.education
              : [{ ...BLANK_EDU }],
          skills: Array.isArray(resume.skills)
            ? resume.skills.join(", ")
            : resume.skills || "",
          projects: Array.isArray(resume.projects) ? resume.projects : [],
          certifications: Array.isArray(resume.certifications)
            ? resume.certifications
            : [],
        });
      } else {
        setData((d) => ({ ...d, email: user?.email || "" }));
      }
      setDataLoaded(true);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [resumeData, dataLoaded, user]);

  const saveMutation = useMutation({
    mutationFn: () => resumeService.saveResume(toResumePayload(data)),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resume", "me"] });
      toast.success("Resume saved", "Your resume draft has been saved.");
    },
    onError: (err) =>
      toast.error(
        "Save failed",
        err.message || "Could not save your resume draft.",
      ),
  });

  const setField = (field) => (e) => {
    setValidationError("");
    setData((d) => ({ ...d, [field]: e.target.value }));
  };

  const updateExp = (i, field, value) =>
    setData((d) => {
      const experience = [...d.experience];
      experience[i] = { ...experience[i], [field]: value };
      return { ...d, experience };
    });

  const addExp = () =>
    setData((d) => ({ ...d, experience: [...d.experience, { ...BLANK_EXP }] }));
  const removeExp = (i) =>
    setData((d) => ({
      ...d,
      experience: d.experience.filter((_, j) => j !== i),
    }));

  const updateEdu = (i, field, value) =>
    setData((d) => {
      const education = [...d.education];
      education[i] = { ...education[i], [field]: value };
      return { ...d, education };
    });

  const addEdu = () =>
    setData((d) => ({ ...d, education: [...d.education, { ...BLANK_EDU }] }));
  const removeEdu = (i) =>
    setData((d) => ({
      ...d,
      education: d.education.filter((_, j) => j !== i),
    }));

  const handleDownloadPdf = async () => {
    if (!data.name.trim()) {
      setValidationError("Full name is required before downloading your PDF.");
      toast.error(
        "Missing resume name",
        "Please enter your full name before downloading.",
      );
      return;
    }
    if (data.email && !/^\S+@\S+\.\S+$/.test(data.email)) {
      setValidationError(
        "Enter a valid email address before downloading your PDF.",
      );
      toast.error(
        "Invalid email",
        "Please check the email address on your resume.",
      );
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const blob = await pdf(
        <ResumePDFDocument data={toResumePayload(data)} />,
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const safeName =
        data.name
          .trim()
          .replace(/[^a-z0-9]+/gi, "_")
          .replace(/^_|_$/g, "") || "User";
      link.href = url;
      link.download = `LocalSkill_Resume_${safeName}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      toast.success("PDF ready", "Your resume PDF has been downloaded.");
    } catch {
      toast.error("PDF failed", "Could not generate PDF. Please try again.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto animate-pulse bg-white border border-slate-200 rounded-xl h-96" />
    );
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Resume Builder</h1>
          <p className="text-slate-500 text-sm mt-1">
            Build a professional resume to stand out from the crowd
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Save}
            loading={saveMutation.isPending}
            disabled={saveMutation.isPending}
            onClick={() => saveMutation.mutate()}
          >
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Download}
            loading={isGeneratingPdf}
            disabled={isGeneratingPdf}
            onClick={handleDownloadPdf}
          >
            {isGeneratingPdf ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {validationError && (
        <Alert
          type="error"
          message={validationError}
          dismissible
          onClose={() => setValidationError("")}
          className="mb-6"
        />
      )}
      {saveMutation.isSuccess && (
        <Alert
          type="success"
          message="Resume draft saved to your profile."
          dismissible
          className="mb-6"
        />
      )}
      {saveMutation.isError && (
        <Alert
          type="error"
          message="Failed to save. Please try again."
          dismissible
          className="mb-6"
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor */}
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex border-b border-slate-100 overflow-x-auto">
            {tabs.map((tab, i) => (
              <button
                key={tab}
                onClick={() => setActiveTab(i)}
                className={cn(
                  "px-4 py-3.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
                  activeTab === i
                    ? "border-blue-600 text-blue-700"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                )}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="p-6 space-y-4">
            {activeTab === 0 && (
              <>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    value={data.name}
                    onChange={setField("name")}
                  />
                  <Input
                    label="Professional Title"
                    value={data.title}
                    onChange={setField("title")}
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={data.email}
                    onChange={setField("email")}
                  />
                  <Input
                    label="Phone"
                    value={data.phone}
                    onChange={setField("phone")}
                  />
                </div>
                <Input
                  label="Location"
                  value={data.location}
                  onChange={setField("location")}
                />
                <Input
                  label="Portfolio / Website"
                  value={data.portfolio || ""}
                  onChange={setField("portfolio")}
                />
                <Textarea
                  label="Professional Summary"
                  rows={4}
                  value={data.summary}
                  onChange={setField("summary")}
                  hint="Write 2-3 sentences about your experience and key strengths"
                />
              </>
            )}

            {activeTab === 1 && (
              <div className="space-y-4">
                {data.experience.map((exp, i) => (
                  <div
                    key={i}
                    className="border border-slate-200 rounded-xl p-4 relative"
                  >
                    {data.experience.length > 1 && (
                      <button
                        onClick={() => removeExp(i)}
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input
                        label="Job Title"
                        value={exp.role}
                        onChange={(e) => updateExp(i, "role", e.target.value)}
                      />
                      <Input
                        label="Company"
                        value={exp.company}
                        onChange={(e) =>
                          updateExp(i, "company", e.target.value)
                        }
                      />
                      <Input
                        label="Start Date"
                        type="month"
                        value={exp.startDate}
                        onChange={(e) =>
                          updateExp(i, "startDate", e.target.value)
                        }
                      />
                      <div>
                        <Input
                          label="End Date"
                          type="month"
                          value={exp.endDate}
                          onChange={(e) =>
                            updateExp(i, "endDate", e.target.value)
                          }
                          disabled={exp.isCurrent}
                          placeholder="Present"
                        />
                        <label className="flex items-center gap-2 mt-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={exp.isCurrent}
                            onChange={(e) =>
                              updateExp(i, "isCurrent", e.target.checked)
                            }
                            className="rounded border-slate-300 accent-blue-600"
                          />
                          <span className="text-xs text-slate-600">
                            Currently working here
                          </span>
                        </label>
                      </div>
                    </div>
                    <Textarea
                      label="Description"
                      rows={3}
                      className="mt-3"
                      value={exp.description}
                      onChange={(e) =>
                        updateExp(i, "description", e.target.value)
                      }
                    />
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={Plus}
                  onClick={addExp}
                >
                  Add Experience
                </Button>
              </div>
            )}

            {activeTab === 2 && (
              <div className="space-y-4">
                {data.education.map((edu, i) => (
                  <div
                    key={i}
                    className="border border-slate-200 rounded-xl p-4 relative"
                  >
                    {data.education.length > 1 && (
                      <button
                        onClick={() => removeEdu(i)}
                        className="absolute top-3 right-3 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Input
                        label="Degree"
                        value={edu.degree}
                        onChange={(e) => updateEdu(i, "degree", e.target.value)}
                      />
                      <Input
                        label="Institution"
                        value={edu.institution}
                        onChange={(e) =>
                          updateEdu(i, "institution", e.target.value)
                        }
                      />
                      <Input
                        label="Start Year"
                        value={edu.startYear}
                        onChange={(e) =>
                          updateEdu(i, "startYear", e.target.value)
                        }
                      />
                      <Input
                        label="End Year"
                        value={edu.endYear}
                        onChange={(e) =>
                          updateEdu(i, "endYear", e.target.value)
                        }
                      />
                    </div>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  icon={GraduationCap}
                  onClick={addEdu}
                >
                  Add Education
                </Button>
              </div>
            )}

            {activeTab === 3 && (
              <div>
                <Textarea
                  label="Skills"
                  rows={4}
                  value={data.skills}
                  onChange={setField("skills")}
                  hint="Separate skills with commas"
                />
              </div>
            )}

            {activeTab === 4 && (
              <div className="text-center py-6">
                <p className="text-sm text-slate-500">
                  Preview shown on the right →
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preview */}
        <div className="sticky top-24">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Live Preview
            </p>
            <Button
              variant="outline"
              size="xs"
              icon={Download}
              loading={isGeneratingPdf}
              disabled={isGeneratingPdf}
              onClick={handleDownloadPdf}
            >
              PDF
            </Button>
          </div>
          <ResumePreview data={data} />
        </div>
      </div>
    </div>
  );
}
